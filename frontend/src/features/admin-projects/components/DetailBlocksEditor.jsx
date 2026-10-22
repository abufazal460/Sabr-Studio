import { useMemo, useRef, useState } from 'react';
import {
  LuArrowDown,
  LuArrowUp,
  LuGripVertical,
  LuPlus,
  LuTrash2,
  LuX,
} from 'react-icons/lu';
import { Button } from '../../../shared/components/Button';
import TextInput from '../../../shared/components/TextInput';
import TextArea from '../../../shared/components/TextArea';
import Select from '../../../shared/components/Select';
import adminApi from '../api/adminProjects.api';
import { isValidCSSColor } from '../../../shared/utils/colorValidator';
import { ACCEPTED_IMAGE_TYPES, uploadImagesSequentially } from '../../../shared/utils/uploadImage';
import DetailBlockContent from '../../projects/components/DetailBlockContent';
import {
  DETAIL_ALIGNMENTS,
  DETAIL_ASPECTS,
  DETAIL_BLOCK_TYPE_LABELS,
  DETAIL_GAPS,
  DETAIL_HEADING_LEVELS,
  DETAIL_LIST_STYLES,
  DETAIL_MAX_COLUMNS,
  DETAIL_PADDINGS,
  DETAIL_WIDTHS,
  ELEMENT_CATALOG,
  applyDropTarget,
  blockTitle,
  createDetailBlock,
  createDetailRowId,
  groupBlocksIntoRows,
  isValidDetailFontSize,
  moveBlockByOffset,
  moveBlockToAdjacentColumn,
  removeBlockById,
  rowGridClass,
  withReindexedOrder,
} from '../../../shared/utils/detailBuilder';

/**
 * Project Details builder — the Customize screen.
 *
 * Three panels on desktop (Elements / Canvas / Properties), stacked on tablet
 * and mobile:
 *   Elements   drag a chip onto the canvas, or click it to append one
 *   Canvas     the real section layout: rows, columns, drop zones, selection
 *   Properties content and layout controls for the selected element only
 *
 * Drag-and-drop is native HTML5 DnD, so no dependency is added. Dragging, the
 * keyboard shortcuts and the Properties panel all call the same placement
 * helpers, which keeps the three input methods in sync and still gives touch
 * devices full control over rows and columns without needing a drag.
 */

const DRAG_MIME = 'application/x-sabr-detail-block';

const cx = (...parts) => parts.filter(Boolean).join('');

const panelTitleClass = 'text-[11px] font-mono uppercase tracking-wider text-muted';

const optionLabels = (values, labels = {}) =>
  values.map((value) => ({ value, label: labels[value] ?? value }));

const ALIGN_LABELS = { left: 'Left', center: 'Center', right: 'Right' };
const WIDTH_LABELS = {
  auto: 'Auto',
  third: '1/3',
  half: '1/2',
  'two-thirds': '2/3',
  'three-quarters': '3/4',
  full: 'Full',
};
const LIST_STYLE_LABELS = { disc: 'Bullets', decimal: 'Numbers', none: 'Plain', check: 'Checks' };
const ASPECT_LABELS = {
  auto: 'Auto',
  '16/9': '16 : 9',
  '16/10': '16 : 10',
  '4/3': '4 : 3',
  '3/4': '3 : 4',
  '1/1': 'Square',
  '3/2': '3 : 2',
};
const HEADING_LEVEL_LABELS = {
  1: 'H1 — Large',
  2: 'H2 — Default',
  3: 'H3 — Small',
  4: 'H4 — Tiny',
};

const clampCol = (value, fallback = 0) => {
  const col = Number(value);
  if (!Number.isFinite(col)) return fallback;
  return Math.min(Math.max(Math.trunc(col), 0), DETAIL_MAX_COLUMNS - 1);
};

const IMAGE_LAYOUT_OPTIONS = [
  { value: '', label: 'Default (image above)' },
  { value: 'image-above', label: 'Image above text' },
  { value: 'image-below', label: 'Image below text' },
  { value: 'image-left', label: 'Image left, text right' },
  { value: 'image-right', label: 'Image right, text left' },
  { value: 'full-width', label: 'Image only, full width' },
];

// ---------------------------------------------------------------------------
// Field pieces
// ---------------------------------------------------------------------------

/** Ordered string list: edit, add, remove and reorder. */
const StringListEditor = ({ idPrefix, label, items, onChange, addLabel = 'Add Item', rows = 1 }) => {
  const list = Array.isArray(items) ? items : [];

  const update = (idx, value) => onChange(list.map((item, j) => (j === idx ? value : item)));
  const remove = (idx) => onChange(list.filter((_, j) => j !== idx));
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={panelTitleClass}>{label}</span>
        <Button
          type="button"
          variant="Secondary-Outline"
          size="sm"
          icon={LuPlus}
          iconPosition="left"
          label={addLabel}
          onClick={() => onChange([...list, ''])}
        />
      </div>

      {list.length === 0 && <p className="text-xs text-muted">No entries yet.</p>}

      <div className="space-y-2">
        {list.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            {rows > 1 ? (
              <TextArea
                id={`${idPrefix}-${idx}`}
                rows={rows}
                value={item ?? ''}
                onChange={(e) => update(idx, e.target.value)}
                className="flex-1"
              />
            ) : (
              <TextInput
                id={`${idPrefix}-${idx}`}
                value={item ?? ''}
                onChange={(e) => update(idx, e.target.value)}
                className="flex-1"
              />
            )}
            <div className="flex items-center gap-1 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move item up"
                className="p-1.5 text-muted hover:text-ink transition-colors disabled:opacity-30"
              >
                <LuArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === list.length - 1}
                aria-label="Move item down"
                className="p-1.5 text-muted hover:text-ink transition-colors disabled:opacity-30"
              >
                <LuArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Remove item"
                className="p-1.5 text-muted hover:text-error transition-colors"
              >
                <LuTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChoiceField = ({ id, label, value, onChange, options, disabled }) => (
  <Select
    id={id}
    label={label}
    placeholder=""
    disabled={disabled}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    options={options}
  />
);

const ColorField = ({ id, label, value, onChange }) => (
  <div className="space-y-1">
    <TextInput
      id={id}
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="#F4EFEA"
    />
    {value && !isValidCSSColor(value) && (
      <p className="text-[11px] text-error">Not a valid CSS colour — correct it before saving.</p>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Elements panel
// ---------------------------------------------------------------------------

const ElementsPanel = ({ onAdd, onDragStartNew, onDragEnd }) => (
  <div className="space-y-2">
    <span className={panelTitleClass}>Elements</span>
    <p className="text-[11px] text-muted leading-relaxed">Drag onto the canvas, or click to append.</p>
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {ELEMENT_CATALOG.map((element) => (
        <li key={element.key}>
          <button
            type="button"
            draggable
            onDragStart={(e) => onDragStartNew(e, element)}
            onDragEnd={onDragEnd}
            onClick={() => onAdd(element)}
            aria-label={`Add ${element.label} element`}
            className="w-full flex items-center gap-2 text-left px-3 py-2.5 border border-border rounded-sm bg-white hover:border-ink hover:shadow-hover transition-all cursor-grab active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-ink"
          >
            <LuGripVertical className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm text-ink truncate">{element.label}</span>
              <span className="block text-[10px] text-muted truncate">{element.hint}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);

// ---------------------------------------------------------------------------
// Canvas pieces
// ---------------------------------------------------------------------------

/**
 * Drop zone. `zone` carries the live drag state and the generic handlers; the
 * slot this zone represents is handed to them on the event, which is what lets
 * drag, keyboard and panel placement share one code path.
 */
const DropZone = ({ slot, zone, tall = false, label = '' }) => (
  <div
    role="presentation"
    onDragOver={(e) => zone.onDragOver(e, slot)}
    onDragLeave={zone.onDragLeave}
    onDrop={(e) => zone.onDrop(e, slot)}
    className={cx(
      'rounded-sm transition-all flex items-center justify-center',
      tall ? 'min-h-[34px]' : 'h-4 -my-1',
      zone.isHinted(slot)
        ? 'bg-ink/80 ring-1 ring-ink'
        : zone.dragActive
        ? 'border border-dashed border-ink/50 bg-ink/5'
        : 'border border-transparent'
    )}
  >
    {zone.dragActive && label ? (
      <span className="text-[10px] font-mono uppercase tracking-wider text-ink/70 px-1">{label}</span>
    ) : null}
  </div>
);

const BlockCard = ({ block, card }) => (
  <div
    id={`dbl-card-${block.id}`}
    role="button"
    tabIndex={0}
    aria-pressed={card.selectedId === block.id}
    aria-label={`${DETAIL_BLOCK_TYPE_LABELS[block.type] || 'Block'}, ${blockTitle(block)}. Press Enter to edit its properties.`}
    draggable
    onClick={() => card.onSelect(block)}
    onFocus={() => card.onSelect(block)}
    onKeyDown={(e) => card.onKeyDown(e, block)}
    onDragStart={(e) => card.onDragStart(e, block)}
    onDragEnd={card.onDragEnd}
    className={cx(
      'relative border rounded-sm bg-white p-3 pl-8 space-y-2 transition-shadow cursor-grab active:cursor-grabbing',
      'focus:outline-none focus:ring-1 focus:ring-ink',
      card.selectedId === block.id ? 'border-ink shadow-hover' : 'border-border hover:border-muted/60',
      card.draggingId === block.id && 'opacity-40'
    )}
  >
    <LuGripVertical className="w-4 h-4 text-muted absolute left-2 top-3.5" aria-hidden="true" />
    <div className="flex items-center justify-between gap-2">
      <span className={panelTitleClass}>{DETAIL_BLOCK_TYPE_LABELS[block.type] || block.type}</span>
      <span className="text-[11px] text-muted truncate max-w-[55%]">{blockTitle(block)}</span>
    </div>
    <div className="pointer-events-none select-none">
      <DetailBlockContent block={block} showEmpty />
    </div>
  </div>
);

const CanvasColumn = ({ row, column, zone, card }) => (
  <div className="min-w-0 space-y-1">
    {column.map((block) => (
      <div key={block.id}>
        <DropZone
          slot={{ rowId: row.rowId, col: clampCol(block.place?.col), beforeId: block.id }}
          zone={zone}
        />
        <BlockCard block={block} card={card} />
      </div>
    ))}
    <DropZone
      slot={{ rowId: row.rowId, col: clampCol(column[column.length - 1].place?.col), beforeId: null }}
      zone={zone}
      tall
      label="Below in column"
    />
  </div>
);

const CanvasRow = ({ row, rowNumber, zone, card }) => {
  const joinCol = clampCol(row.columns.length);

  if (row.columns.length === 1) {
    return (
      <div className="space-y-1">
        {row.columns[0].map((block) => (
          <div key={block.id}>
            <DropZone slot={{ rowId: row.rowId, col: 0, beforeId: block.id }} zone={zone} />
            <BlockCard block={block} card={card} />
          </div>
        ))}
        <DropZone
          slot={{ joinRowKey: row.key, col: joinCol }}
          zone={zone}
          tall
          label="Drop beside to make a column"
        />
      </div>
    );
  }

  return (
    <div className="border border-dashed border-border rounded-sm p-2 space-y-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className={panelTitleClass}>Row {rowNumber}</span>
        <span className="text-[10px] text-muted">
          {row.columns.length} columns on desktop · stacked on mobile
        </span>
      </div>
      <div className={cx('grid gap-2 items-start', rowGridClass(row.columns.length))}>
        {row.columns.map((column, colIdx) => (
          <CanvasColumn key={colIdx} row={row} column={column} zone={zone} card={card} />
        ))}
        {row.columns.length < DETAIL_MAX_COLUMNS && (
          <DropZone slot={{ joinRowKey: row.key, col: joinCol }} zone={zone} tall label="Add column" />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Content forms, one per element type
// ---------------------------------------------------------------------------

const SectionsContentForm = ({ block, onPayload }) => {
  const payload = block.sections || {};
  return (
    <div className="space-y-3">
      <TextInput
        id="dbl-sec-heading"
        label="Heading"
        value={payload.heading || ''}
        onChange={(e) => onPayload({ heading: e.target.value })}
        placeholder="e.g. Spatial Narrative"
      />
      <TextArea
        id="dbl-sec-intro"
        label="Intro"
        rows={2}
        value={payload.intro || ''}
        onChange={(e) => onPayload({ intro: e.target.value })}
        placeholder="Optional intro line"
      />
      <StringListEditor
        idPrefix="dbl-sec-para"
        label={`Paragraphs (${(payload.paragraphs || []).length})`}
        items={payload.paragraphs || []}
        addLabel="Add Paragraph"
        rows={3}
        onChange={(paragraphs) => onPayload({ paragraphs })}
      />
    </div>
  );
};

const ListsContentForm = ({ block, onPayload }) => {
  const payload = block.lists || {};
  return (
    <div className="space-y-3">
      <TextInput
        id="dbl-list-heading"
        label="List Heading"
        value={payload.heading || ''}
        onChange={(e) => onPayload({ heading: e.target.value })}
        placeholder="e.g. Design Principles"
      />
      <TextArea
        id="dbl-list-paragraph"
        label="Intro Paragraph"
        rows={2}
        value={payload.paragraph || ''}
        onChange={(e) => onPayload({ paragraph: e.target.value })}
        placeholder="Optional line above the list"
      />
      <StringListEditor
        idPrefix="dbl-list-item"
        label={`Items (${(payload.items || []).length})`}
        items={payload.items || []}
        onChange={(items) => onPayload({ items })}
      />
    </div>
  );
};

const KeywordsContentForm = ({ block, onPayload }) => {
  const payload = block.keywords || {};
  return (
    <div className="space-y-3">
      <TextInput
        id="dbl-kw-heading"
        label="Keywords Heading"
        value={payload.heading || ''}
        onChange={(e) => onPayload({ heading: e.target.value })}
        placeholder="e.g. Materials & Techniques"
      />
      <StringListEditor
        idPrefix="dbl-kw-item"
        label={`Keywords (${(payload.items || []).length})`}
        items={payload.items || []}
        onChange={(items) => onPayload({ items })}
      />
    </div>
  );
};

const PaletteContentForm = ({ block, onPayload }) => {
  const payload = block.palette || {};
  const colors = Array.isArray(payload.colors) ? payload.colors : [];

  const patchColor = (idx, patch) =>
    onPayload({ colors: colors.map((color, j) => (j === idx ? { ...color, ...patch } : color)) });

  const moveColor = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= colors.length) return;
    const next = [...colors];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    onPayload({ colors: next });
  };

  return (
    <div className="space-y-3">
      <TextInput
        id="dbl-pal-heading"
        label="Palette Heading"
        value={payload.heading || ''}
        onChange={(e) => onPayload({ heading: e.target.value })}
        placeholder="Color Palette"
      />

      <div className="flex items-center justify-between gap-2">
        <span className={panelTitleClass}>Colours ({colors.length})</span>
        <Button
          type="button"
          variant="Secondary-Outline"
          size="sm"
          icon={LuPlus}
          iconPosition="left"
          label="Add Colour"
          onClick={() => onPayload({ colors: [...colors, { name: '', value: '', description: '' }] })}
        />
      </div>

      {colors.length === 0 && <p className="text-xs text-muted">No colours yet.</p>}

      <div className="space-y-3">
        {colors.map((color, idx) => (
          <div key={idx} className="space-y-2 border border-border rounded-sm bg-white p-2">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full border border-border shrink-0"
                style={{ backgroundColor: color.value || 'transparent' }}
                aria-hidden="true"
              />
              <TextInput
                id={`dbl-pal-value-${idx}`}
                value={color.value || ''}
                onChange={(e) => patchColor(idx, { value: e.target.value })}
                placeholder="#D9C7B8"
                className="flex-1"
                error={color.value && !isValidCSSColor(color.value) ? 'Invalid colour' : undefined}
              />
              <div className="flex items-center gap-1 shrink-0 pt-2">
                <button
                  type="button"
                  onClick={() => moveColor(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move colour up"
                  className="p-1.5 text-muted hover:text-ink disabled:opacity-30"
                >
                  <LuArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveColor(idx, 1)}
                  disabled={idx === colors.length - 1}
                  aria-label="Move colour down"
                  className="p-1.5 text-muted hover:text-ink disabled:opacity-30"
                >
                  <LuArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onPayload({ colors: colors.filter((_, j) => j !== idx) })}
                  aria-label="Remove colour"
                  className="p-1.5 text-muted hover:text-error transition-colors"
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <TextInput
              id={`dbl-pal-name-${idx}`}
              value={color.name || ''}
              onChange={(e) => patchColor(idx, { name: e.target.value })}
              placeholder="Colour name"
            />
            <TextInput
              id={`dbl-pal-note-${idx}`}
              value={color.description || ''}
              onChange={(e) => patchColor(idx, { description: e.target.value })}
              placeholder="Optional note"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ImageContentForm = ({ block, onPayload }) => {
  const payload = block.imageBlocks || {};
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;

    setError('');
    setUploading(true);
    setProgress(0);

    const { uploaded, errors } = await uploadImagesSequentially([file], (f) =>
      adminApi.uploadImage(f, { folder: 'projects', onUploadProgress: setProgress })
    );

    // What gets stored is the real Cloudinary URL from the response.
    if (uploaded[0]?.url) onPayload({ url: uploaded[0].url });
    if (errors.length) setError(errors.join(' '));
    setUploading(false);
    setProgress(0);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 border border-border rounded-sm p-2">
        <label className="block">
          <span className={panelTitleClass}>Upload</span>
          <input
            id="dbl-img-file"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={handleUpload}
            disabled={uploading}
            className="mt-1 w-full text-xs text-ink file:mr-2 file:px-2 file:py-1 file:border file:border-border file:rounded-sm file:bg-white file:text-xs"
          />
        </label>

        {uploading && (
          <div className="h-1 w-full bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <TextInput
          id="dbl-img-url"
          label="Image URL"
          value={payload.url || ''}
          onChange={(e) => onPayload({ url: e.target.value })}
          placeholder="https://… or upload a file above"
          error={error || undefined}
        />

        {payload.url && (
          <div className="relative w-full aspect-[16/9] rounded-sm overflow-hidden border border-border bg-surface">
            <img
              src={payload.url}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setError('That URL did not load — check the address or upload a file.')}
            />
          </div>
        )}
      </div>

      <Select
        id="dbl-img-layout"
        label="Image Position"
        placeholder=""
        value={
          IMAGE_LAYOUT_OPTIONS.some((option) => option.value === payload.layout) ? payload.layout : ''
        }
        onChange={(e) => onPayload({ layout: e.target.value })}
        options={IMAGE_LAYOUT_OPTIONS}
      />

      <TextInput
        id="dbl-img-heading"
        label="Heading"
        value={payload.heading || ''}
        onChange={(e) => onPayload({ heading: e.target.value })}
      />
      <TextInput
        id="dbl-img-caption"
        label="Caption"
        value={payload.caption || ''}
        onChange={(e) => onPayload({ caption: e.target.value })}
        placeholder="Optional overlay"
      />
      <StringListEditor
        idPrefix="dbl-img-sub"
        label={`Subheadings (${(payload.subheadings || []).length})`}
        items={payload.subheadings || []}
        addLabel="Add Subheading"
        onChange={(subheadings) => onPayload({ subheadings })}
      />
      <StringListEditor
        idPrefix="dbl-img-para"
        label={`Paragraphs (${(payload.paragraphs || []).length})`}
        items={payload.paragraphs || []}
        addLabel="Add Paragraph"
        rows={3}
        onChange={(paragraphs) => onPayload({ paragraphs })}
      />
      <StringListEditor
        idPrefix="dbl-img-item"
        label={`Items (${(payload.items || []).length})`}
        items={payload.items || []}
        onChange={(items) => onPayload({ items })}
      />
    </div>
  );
};

const CONTENT_FORMS = {
  sections: SectionsContentForm,
  lists: ListsContentForm,
  keywords: KeywordsContentForm,
  palette: PaletteContentForm,
  imageBlocks: ImageContentForm,
};

// ---------------------------------------------------------------------------
// Properties panel
// ---------------------------------------------------------------------------

const PropertiesPanel = ({ block, rows, onPayload, onStyle, onRowPlace, onColumnPlace, onRemove, onClose }) => {
  if (!block) {
    return (
      <div className="space-y-2">
        <span className={panelTitleClass}>Properties</span>
        <p className="text-xs text-muted leading-relaxed">
          Select an element on the canvas to edit its content and layout. Drag elements between
          rows and columns, or use Alt + arrow keys while an element is focused.
        </p>
      </div>
    );
  }

  const style = block.style || {};
  const ContentForm = CONTENT_FORMS[block.type];
  const isInRow = Boolean(block.place?.rowId);
  const currentCol = clampCol(block.place?.col);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={panelTitleClass}>Properties</span>
          <p className="text-sm text-ink truncate">{DETAIL_BLOCK_TYPE_LABELS[block.type] || block.type}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close properties"
          className="p-1.5 text-muted hover:text-ink transition-colors"
        >
          <LuX className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <span className={panelTitleClass}>Layout</span>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceField
            id="dbl-place-row"
            label="Section Row"
            value={block.place?.rowId || ''}
            onChange={(rowKey) => onRowPlace(block, rowKey)}
            options={[
              { value: '', label: 'Own full-width row' },
              ...rows.map((row, index) => ({
                value: row.rowId || row.key,
                label: `Row ${index + 1} · ${row.columns.length} column${row.columns.length > 1 ? 's' : ''}`,
              })),
            ]}
          />
          <ChoiceField
            id="dbl-place-col"
            label="Column"
            value={String(currentCol)}
            disabled={!isInRow}
            onChange={(col) => onColumnPlace(block, Number(col))}
            options={Array.from({ length: DETAIL_MAX_COLUMNS }, (_, i) => ({
              value: String(i),
              label: `Column ${i + 1}`,
            }))}
          />
        </div>
        {!isInRow && (
          <p className="text-[11px] text-muted">
            This element is in its own row. Choose another row to place it side by side.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <span className={panelTitleClass}>Style</span>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceField
            id="dbl-style-width"
            label="Element Width"
            value={style.width || ''}
            onChange={(width) => onStyle(block, { width })}
            options={optionLabels(DETAIL_WIDTHS, WIDTH_LABELS)}
          />
          <ChoiceField
            id="dbl-style-align"
            label="Alignment"
            value={style.align || ''}
            onChange={(align) => onStyle(block, { align })}
            options={optionLabels(DETAIL_ALIGNMENTS, ALIGN_LABELS)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceField
            id="dbl-style-padding"
            label="Spacing / Padding"
            value={style.padding || ''}
            onChange={(padding) => onStyle(block, { padding })}
            options={optionLabels(DETAIL_PADDINGS)}
          />
          <TextInput
            id="dbl-style-font-size"
            label="Font Size"
            value={style.fontSize || ''}
            onChange={(e) => onStyle(block, { fontSize: e.target.value })}
            placeholder="e.g. 18px"
            error={
              style.fontSize && !isValidDetailFontSize(style.fontSize)
                ? 'Use px / rem / em / % (e.g. 18px)'
                : undefined
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            id="dbl-style-color"
            label="Text Colour"
            value={style.color}
            onChange={(color) => onStyle(block, { color })}
          />
          <ColorField
            id="dbl-style-bg"
            label="Highlight / Shading"
            value={style.background}
            onChange={(background) => onStyle(block, { background })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceField
            id="dbl-style-level"
            label="Heading Level"
            value={String(style.headingLevel || '')}
            onChange={(level) => onStyle(block, { headingLevel: Number(level) || 0 })}
            options={[
              { value: '', label: 'Default (H2)' },
              ...DETAIL_HEADING_LEVELS.map((level) => ({
                value: String(level),
                label: HEADING_LEVEL_LABELS[level],
              })),
            ]}
          />
          {['lists', 'keywords', 'imageBlocks'].includes(block.type) && (
            <ChoiceField
              id="dbl-style-list"
              label="List Style"
              value={style.listStyle || ''}
              onChange={(listStyle) => onStyle(block, { listStyle })}
              options={optionLabels(DETAIL_LIST_STYLES, LIST_STYLE_LABELS)}
            />
          )}
        </div>

        {block.type === 'imageBlocks' && (
          <div className="grid grid-cols-2 gap-2">
            <ChoiceField
              id="dbl-style-image-width"
              label="Image Width"
              value={style.imageWidth || ''}
              onChange={(imageWidth) => onStyle(block, { imageWidth })}
              options={optionLabels(DETAIL_WIDTHS, WIDTH_LABELS)}
            />
            <ChoiceField
              id="dbl-style-aspect"
              label="Image Aspect Ratio"
              value={style.aspect || ''}
              onChange={(aspect) => onStyle(block, { aspect })}
              options={optionLabels(DETAIL_ASPECTS, ASPECT_LABELS)}
            />
            <ChoiceField
              id="dbl-style-gap"
              label="Text Spacing"
              value={style.gap || ''}
              onChange={(gap) => onStyle(block, { gap })}
              options={optionLabels(DETAIL_GAPS)}
            />
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <span className={panelTitleClass}>Content</span>
        {ContentForm ? <ContentForm block={block} onPayload={(patch) => onPayload(block, patch)} /> : null}
      </div>

      <div className="border-t border-border pt-3">
        <Button
          type="button"
          variant="Secondary-Outline"
          size="sm"
          icon={LuTrash2}
          iconPosition="left"
          label="Delete Element"
          onClick={() => onRemove(block)}
          className="w-full"
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export const DetailBlocksEditor = ({ blocks = [], onChange, hasLegacy = false, onImportLegacy }) => {
  const list = Array.isArray(blocks) ? blocks : [];
  const [selectedId, setSelectedId] = useState(null);
  const [hint, setHint] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [dragState, setDragState] = useState(null);
  const dragRef = useRef(null);

  const rows = useMemo(() => groupBlocksIntoRows(list), [list]);
  const selected = list.find((block) => block.id === selectedId) || null;

  const commit = (next) => onChange(withReindexedOrder(next));
  const notify = (message) => setAnnouncement(message);

  /**
   * Put a block beside the elements of an existing row. When that row is really
   * a standalone element, both sides get the same new rowId, which is how two
   * elements first end up in one row.
   */
  const joinRow = (source, blockId, rowKey, col) => {
    const row = rows.find((entry) => entry.key === rowKey);
    if (!row) return source;

    const rowId = row.rowId || createDetailRowId();
    const base = row.rowId
      ? source
      : source.map((block) =>
          block.id === row.blocks[0].id ? { ...block, place: { rowId, col: 0 } } : block
        );

    return applyDropTarget(base, blockId, { rowId, col: clampCol(col), beforeId: null });
  };

  const dropIntoSlot = (payload, slot) => {
    if (payload.kind === 'new') {
      if (!payload.element) return;
      const block = createDetailBlock(payload.element.type, list.length, payload.element.key);
      const source = [...list, block];
      commit(
        slot.joinRowKey
          ? joinRow(source, block.id, slot.joinRowKey, slot.col)
          : applyDropTarget(source, block.id, {
              rowId: slot.rowId || '',
              col: clampCol(slot.col),
              beforeId: slot.beforeId || null,
            })
      );
      setSelectedId(block.id);
      notify(`${blockTitle(block)} added`);
      return;
    }

    const { blockId } = payload;
    if (!blockId || !list.some((block) => block.id === blockId)) return;

    commit(
      slot.joinRowKey
        ? joinRow(list, blockId, slot.joinRowKey, slot.col)
        : applyDropTarget(list, blockId, {
            rowId: slot.rowId || '',
            col: clampCol(slot.col),
            beforeId: slot.beforeId || null,
          })
    );
    setSelectedId(blockId);
    notify('Element moved');
  };

  const appendElement = (element) => {
    const block = createDetailBlock(element.type, list.length, element.key);
    commit([...list, block]);
    setSelectedId(block.id);
    notify(`${element.label} added`);
  };

  // -- drag lifecycle --------------------------------------------------------

  const startNewDrag = (event, element) => {
    dragRef.current = { kind: 'new', element };
    setDragState({ kind: 'new' });
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      DRAG_MIME,
      JSON.stringify({ kind: 'new', type: element.type, key: element.key })
    );
  };

  const startBlockDrag = (event, block) => {
    dragRef.current = { kind: 'move', blockId: block.id };
    setDragState({ kind: 'move', blockId: block.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: 'move', id: block.id }));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragState(null);
    setHint(null);
  };

  // A drop always fires before dragend, so the ref is the reliable source and
  // the dataTransfer payload is the fallback for cross-window drags.
  const readPayload = (event) => {
    if (dragRef.current) return dragRef.current;
    try {
      const parsed = JSON.parse(event.dataTransfer.getData(DRAG_MIME) || '{}');
      if (parsed.kind === 'new') {
        return { kind: 'new', element: ELEMENT_CATALOG.find((el) => el.key === parsed.key) };
      }
      if (parsed.kind === 'move') return { kind: 'move', blockId: parsed.id };
    } catch {
      return null;
    }
    return null;
  };

  const sameSlot = (a, b) =>
    Boolean(
      a &&
        b &&
        a.joinRowKey === b.joinRowKey &&
        a.rowId === b.rowId &&
        a.col === b.col &&
        a.beforeId === b.beforeId
    );

  const zone = {
    dragActive: Boolean(dragState),
    isHinted: (slot) => Boolean(hint && sameSlot(hint, slot)),
    onDragOver: (event, slot) => {
      if (!dragRef.current) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = dragRef.current.kind === 'new' ? 'copy' : 'move';
      if (!sameSlot(hint, slot)) setHint(slot);
    },
    onDragLeave: () => setHint(null),
    onDrop: (event, slot) => {
      event.preventDefault();
      const payload = readPayload(event);
      setHint(null);
      setDragState(null);
      dragRef.current = null;
      if (payload) dropIntoSlot(payload, slot);
    },
  };

  // -- keyboard --------------------------------------------------------------

  const focusCard = (id) => {
    const card = document.getElementById(`dbl-card-${id}`);
    if (card) card.focus();
  };

  const handleKeyDown = (event, block) => {
    const { key } = event;
    const index = list.findIndex((entry) => entry.id === block.id);

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      const dir = key === 'ArrowDown' ? 1 : -1;
      if (event.altKey) {
        commit(moveBlockByOffset(list, block.id, dir));
        focusCard(block.id);
        notify(`Moved ${blockTitle(block)} ${dir > 0 ? 'down' : 'up'}`);
      } else {
        const target = list[index + dir];
        if (!target) return;
        setSelectedId(target.id);
        focusCard(target.id);
      }
      return;
    }

    if ((key === 'ArrowLeft' || key === 'ArrowRight') && event.altKey) {
      event.preventDefault();
      commit(moveBlockToAdjacentColumn(list, block.id, key === 'ArrowRight' ? 1 : -1));
      focusCard(block.id);
      notify(`Column changed for ${blockTitle(block)}`);
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      commit(removeBlockById(list, block.id));
      if (selectedId === block.id) setSelectedId(null);
      notify(`${blockTitle(block)} deleted`);
    }
  };

  // -- property edits --------------------------------------------------------

  const updatePayload = (block, patch) =>
    commit(
      list.map((entry) =>
        entry.id === block.id
          ? { ...entry, [block.type]: { ...(entry[block.type] || {}), ...patch } }
          : entry
      )
    );

  const updateStyle = (block, patch) =>
    commit(
      list.map((entry) => {
        if (entry.id !== block.id) return entry;
        const clean = Object.fromEntries(
          Object.entries(patch).map(([key, value]) => [
            key,
            typeof value === 'string' ? value.trim() : value,
          ])
        );
        const style = { ...(entry.style || {}), ...clean };
        const hasValue = Object.values(style).some(
          (value) => value !== '' && value !== 0 && value !== null && value !== undefined
        );
        if (hasValue) return { ...entry, style };
        const rest = { ...entry };
        delete rest.style;
        return rest;
      })
    );

  const handleRowPlace = (block, rowKey) => {
    if (!rowKey) {
      // Detach into a row of its own, keeping its current vertical position.
      const rowIndex = rows.findIndex((row) => row.blocks.some((entry) => entry.id === block.id));
      const nextRow = rows[rowIndex + 1];
      commit(
        applyDropTarget(list, block.id, {
          rowId: '',
          col: 0,
          beforeId: nextRow ? nextRow.blocks[0].id : null,
        })
      );
      notify(`${blockTitle(block)} moved to its own row`);
      return;
    }

    const target = rows.find((row) => (row.rowId || row.key) === rowKey);
    if (!target || target.blocks.some((entry) => entry.id === block.id)) return;
    commit(joinRow(list, block.id, target.key, block.place?.rowId ? clampCol(block.place.col) : 1));
    notify(`${blockTitle(block)} placed beside another element`);
  };

  const handleColumnPlace = (block, col) => {
    if (!block.place?.rowId) return;
    commit(
      applyDropTarget(list, block.id, {
        rowId: block.place.rowId,
        col: clampCol(col),
        beforeId: null,
      })
    );
    notify(`${blockTitle(block)} moved to column ${clampCol(col) + 1}`);
  };

  const removeBlock = (block) => {
    commit(removeBlockById(list, block.id));
    if (selectedId === block.id) setSelectedId(null);
    notify(`${blockTitle(block)} deleted`);
  };

  const card = {
    selectedId,
    draggingId: dragState?.kind === 'move' ? dragState.blockId : null,
    onSelect: (block) => setSelectedId(block.id),
    onDragStart: startBlockDrag,
    onDragEnd: endDrag,
    onKeyDown: handleKeyDown,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider font-medium text-ink block">
            Project Details Builder
          </span>
          <span className="text-[11px] text-muted">
            Arrange headings, text, images, lists and palettes into sections and columns.
          </span>
        </div>
        <span className="text-[11px] text-muted">{list.length} elements</span>
      </div>

      {hasLegacy && list.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-sm bg-surface/60 p-3">
          <span className="text-xs text-muted max-w-prose">
            This project still uses the legacy detail fields. Import them as blocks to start
            customizing — the original fields stay in the project until you save.
          </span>
          <Button
            type="button"
            variant="Secondary-Outline"
            size="sm"
            icon={LuPlus}
            iconPosition="left"
            label="Import Legacy Content"
            onClick={onImportLegacy}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)_300px] gap-4">
        <ElementsPanel onAdd={appendElement} onDragStartNew={startNewDrag} onDragEnd={endDrag} />

        <div className="min-w-0 space-y-1 border border-border rounded-sm bg-surface/30 p-2">
          <span className={panelTitleClass}>Canvas</span>

          {list.length === 0 && (
            <DropZone
              slot={{ rowId: '', col: 0, beforeId: null }}
              zone={zone}
              tall
              label="Drop an element here"
            />
          )}

          {rows.map((row, rowIdx) => (
            <div key={row.key} className="space-y-1">
              {list.length > 0 && (
                <DropZone
                  slot={{ rowId: '', col: 0, beforeId: row.blocks[0]?.id }}
                  zone={zone}
                  label="New row"
                />
              )}
              <CanvasRow row={row} rowNumber={rowIdx + 1} zone={zone} card={card} />
            </div>
          ))}

          {list.length > 0 && (
            <DropZone slot={{ rowId: '', col: 0, beforeId: null }} zone={zone} tall label="New row at end" />
          )}

          <p className="text-[11px] text-muted pt-1 leading-relaxed">
            Drag an element onto another to sit beside it, or into a column to move it. Keyboard:
            Alt + Up/Down reorders, Alt + Left/Right changes the column, Delete removes the element.
          </p>
        </div>

        <div className="md:col-span-2 xl:col-span-1 min-w-0 border border-border rounded-sm bg-white p-3">
          <PropertiesPanel
            block={selected}
            rows={rows}
            onPayload={updatePayload}
            onStyle={updateStyle}
            onRowPlace={handleRowPlace}
            onColumnPlace={handleColumnPlace}
            onRemove={removeBlock}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};

export default DetailBlocksEditor;
