/**
 * Shared spec for the dynamic Project Details builder (`project.detailBlocks`).
 *
 * One source of truth for the layout/placement vocabulary so the Mongoose
 * schema, the express-validator rules and the service normaliser can never
 * drift apart. Values are the small tokens the admin builder stores; the
 * public page maps them to responsive Tailwind classes.
 */

export const DETAIL_BLOCK_TYPES = ['palette', 'keywords', 'lists', 'sections', 'imageBlocks'];

/** Maximum columns per section row on desktop. */
export const DETAIL_MAX_COLUMNS = 3;

export const DETAIL_ALIGNMENTS = ['left', 'center', 'right'];
export const DETAIL_WIDTHS = ['auto', 'third', 'half', 'two-thirds', 'three-quarters', 'full'];
export const DETAIL_PADDINGS = ['none', 'sm', 'md', 'lg'];
export const DETAIL_GAPS = ['none', 'sm', 'md', 'lg'];
export const DETAIL_LIST_STYLES = ['disc', 'decimal', 'none', 'check'];
export const DETAIL_ASPECTS = ['auto', '16/9', '16/10', '4/3', '3/4', '1/1', '3/2'];
export const DETAIL_HEADING_LEVELS = [1, 2, 3, 4];

// Three decimals are allowed because Tailwind's own scale uses them (1.125rem).
const CSS_LENGTH_RE = /^\d{1,4}(\.\d{1,3})?(px|rem|em|%)$/;

// An empty string means "no size set": normaliseBlockStyle writes '' for a
// cleared field, so the validator has to accept it or an already-saved project
// could never be re-saved.
export const isValidDetailFontSize = (val) => {
  if (typeof val !== 'string') return false;
  const token = val.trim();
  return token === '' || CSS_LENGTH_RE.test(token);
};

/** Rows are keyed by a short client-generated id; keep it bounded. */
export const isValidDetailRowId = (val) =>
  typeof val === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(val.trim());

/**
 * Normalize `block.place` -> `{ rowId, col }`.
 * A column slot only means something inside a row, so a block without a valid
 * `rowId` normalises to null and renders as a standalone full-width row.
 */
export const normalizeBlockPlace = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const rowId = typeof raw.rowId === 'string' && isValidDetailRowId(raw.rowId)
    ? raw.rowId.trim()
    : '';
  if (!rowId) return null;

  const colNumber = Number(raw.col);
  const col = Number.isFinite(colNumber)
    ? Math.min(Math.max(Math.trunc(colNumber), 0), DETAIL_MAX_COLUMNS - 1)
    : 0;

  return { rowId, col };
};

/**
 * Normalize `block.style`. Only whitelisted, well-formed values survive so a
 * crafted string can never reach the public page as inline CSS.
 * Returns null when nothing valid was supplied.
 */
export const normalizeBlockStyle = (raw, { isValidColor } = {}) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const pickEnum = (val, allowed) => {
    const token = typeof val === 'string' ? val.trim() : '';
    return allowed.includes(token) ? token : '';
  };

  const style = {
    align: pickEnum(raw.align, DETAIL_ALIGNMENTS),
    width: pickEnum(raw.width, DETAIL_WIDTHS),
    imageWidth: pickEnum(raw.imageWidth, DETAIL_WIDTHS),
    aspect: pickEnum(raw.aspect, DETAIL_ASPECTS),
    padding: pickEnum(raw.padding, DETAIL_PADDINGS),
    gap: pickEnum(raw.gap, DETAIL_GAPS),
    listStyle: pickEnum(raw.listStyle, DETAIL_LIST_STYLES),
    fontSize: isValidDetailFontSize(raw.fontSize) ? raw.fontSize.trim() : '',
    color:
      raw.color && typeof isValidColor === 'function' && isValidColor(String(raw.color))
        ? String(raw.color).trim()
        : '',
    background:
      raw.background && typeof isValidColor === 'function' && isValidColor(String(raw.background))
        ? String(raw.background).trim()
        : '',
  };

  const level = Number(raw.headingLevel);
  style.headingLevel = DETAIL_HEADING_LEVELS.includes(level) ? level : 0;

  const hasValue = Object.values(style).some((v) => v !== '' && v !== 0);
  return hasValue ? style : null;
};

/**
 * Group an ordered block list into render rows.
 *
 * Consecutive blocks sharing `place.rowId` form one row; each row is split into
 * columns by `place.col`, and blocks with the same column stack in array order.
 * Used by both the admin canvas and the public page so both agree on layout.
 */
export const groupBlocksIntoRows = (blocks) => {
  const rows = [];
  let current = null;

  (Array.isArray(blocks) ? blocks : []).forEach((block, index) => {
    if (!block || typeof block !== 'object') return;
    const rowId = typeof block.place?.rowId === 'string' ? block.place.rowId : '';
    const key = rowId || `__single_${block.id || index}`;

    if (current && current.key === key) {
      current.blocks.push(block);
      return;
    }

    current = { key, rowId, blocks: [block] };
    rows.push(current);
  });

  return rows.map((row) => {
    // Bucket by requested column, then compact: a row only materialises the
    // columns that actually hold a block, so an element dragged to "column 3"
    // of a two-element row can never leave a phantom empty gutter.
    const byCol = new Map();
    row.blocks.forEach((block) => {
      const requested = Number(block?.place?.col);
      const col = Number.isFinite(requested)
        ? Math.min(Math.max(Math.trunc(requested), 0), DETAIL_MAX_COLUMNS - 1)
        : 0;
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col).push(block);
    });

    const columns = [...byCol.keys()]
      .sort((a, b) => a - b)
      .map((col) => byCol.get(col));

    return { key: row.key, rowId: row.rowId, columns, blockCount: row.blocks.length };
  });
};
