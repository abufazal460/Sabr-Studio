/**
 * Shared spec for the Project Details builder.
 *
 * Mirrors `backend/utils/detailBlockSpec.js` (the two packages install
 * independently and cannot share an import), and adds the layout math plus the
 * Tailwind class maps the builder canvas and the public project page use, so a
 * section arranged in admin renders identically on sabrstudio.in.
 */

export const DETAIL_BLOCK_TYPES = ['palette', 'keywords', 'lists', 'sections', 'imageBlocks'];

export const DETAIL_BLOCK_TYPE_LABELS = {
  palette: 'Color Palette',
  keywords: 'Keywords',
  lists: 'List',
  sections: 'Text Section',
  imageBlocks: 'Image + Text',
};

export const DETAIL_MAX_COLUMNS = 3;

export const DETAIL_ALIGNMENTS = ['left', 'center', 'right'];
export const DETAIL_WIDTHS = ['auto', 'third', 'half', 'two-thirds', 'three-quarters', 'full'];
export const DETAIL_PADDINGS = ['none', 'sm', 'md', 'lg'];
export const DETAIL_GAPS = ['none', 'sm', 'md', 'lg'];
export const DETAIL_LIST_STYLES = ['disc', 'decimal', 'none', 'check'];
export const DETAIL_ASPECTS = ['auto', '16/9', '16/10', '4/3', '3/4', '1/1', '3/2'];
export const DETAIL_HEADING_LEVELS = [1, 2, 3, 4];

/** Same grammar the backend accepts, so the admin is warned before a save fails. */
export const isValidDetailFontSize = (value) =>
  value === '' || /^\d{1,4}(\.\d{1,3})?(px|rem|em|%)$/.test(String(value).trim());

/**
 * Elements offered in the builder's Elements panel.
 * `heading` and `paragraph` are both `sections` blocks — the renderer prints
 * whichever parts are filled, so a heading-only block *is* a heading element.
 * Keeping them on the existing type enum means no new backend vocabulary.
 */
export const ELEMENT_CATALOG = [
  { key: 'heading', label: 'Heading', type: 'sections', hint: 'One heading line' },
  { key: 'paragraph', label: 'Paragraph', type: 'sections', hint: 'Body copy' },
  { key: 'list', label: 'List', type: 'lists', hint: 'Titled bullet list' },
  { key: 'image', label: 'Image', type: 'imageBlocks', hint: 'Upload or paste a URL' },
  { key: 'palette', label: 'Color Palette', type: 'palette', hint: 'Named colour swatches' },
  { key: 'keywords', label: 'Keywords', type: 'keywords', hint: 'Short tag list' },
];

export const createDetailBlockId = (type) =>
  `blk_${type}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const createDetailRowId = () =>
  `row_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const createDetailBlock = (type, order = 0, elementKey = type) => {
  const id = createDetailBlockId(type);
  const base = { id, type, order };

  if (type === 'palette') {
    return { ...base, palette: { heading: 'Color Palette', colors: [] } };
  }
  if (type === 'keywords') {
    // The backend grammar needs a heading and one non-empty tag, so a fresh
    // element starts with an editable stub instead of a payload that cannot save.
    return { ...base, keywords: { heading: 'Keywords', items: ['keyword'] } };
  }
  if (type === 'lists') {
    return { ...base, lists: { heading: '', paragraph: '', items: [] } };
  }
  if (type === 'sections') {
    return {
      ...base,
      sections: {
        heading: '',
        intro: '',
        // A paragraph element starts with one empty line to edit; a heading
        // element starts with none, so it renders as a heading until copy is added.
        paragraphs: elementKey === 'paragraph' ? [''] : [],
      },
    };
  }
  return {
    ...base,
    imageBlocks: {
      url: '',
      heading: '',
      paragraphs: [],
      subheadings: [],
      items: [],
      caption: '',
      layout: '',
    },
  };
};

export const withReindexedOrder = (blocks) =>
  blocks.map((block, index) => ({ ...block, order: index }));

const clampCol = (value) => {
  const col = Number(value);
  if (!Number.isFinite(col)) return 0;
  return Math.min(Math.max(Math.trunc(col), 0), DETAIL_MAX_COLUMNS - 1);
};

const rowIdOf = (block) =>
  typeof block?.place?.rowId === 'string' ? block.place.rowId : '';

/**
 * Group an ordered block list into render rows.
 *
 * Consecutive blocks sharing `place.rowId` form one row; inside a row blocks
 * are bucketed by `place.col` and the buckets are compacted left to right, so
 * unused columns never materialise as empty gutters.
 */
export const groupBlocksIntoRows = (blocks) => {
  const rows = [];
  let current = null;

  (Array.isArray(blocks) ? blocks : []).forEach((block, index) => {
    if (!block || typeof block !== 'object') return;
    const rowId = rowIdOf(block);
    const key = rowId || `__single_${block.id || index}`;

    if (current && current.key === key) {
      current.blocks.push(block);
      return;
    }

    current = { key, rowId, blocks: [block] };
    rows.push(current);
  });

  return rows.map((row) => {
    const byCol = new Map();
    row.blocks.forEach((block) => {
      const col = clampCol(block?.place?.col);
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col).push(block);
    });

    const columns = [...byCol.keys()]
      .sort((a, b) => a - b)
      .map((col) => byCol.get(col));

    // `blocks` is the row in document order and `columns` is its rendered
    // bucketing; the canvas needs both, because a slot that inserts "before
    // this row" is anchored on the row's first element in document order.
    return {
      key: row.key,
      rowId: row.rowId,
      blocks: row.blocks,
      columns,
      blockCount: row.blocks.length,
    };
  });
};

/** Flat index in `blocks` just before which the slot's first element sits. */
const slotInsertIndex = (blocks, rowId, col, beforeId) => {
  if (beforeId) {
    const idx = blocks.findIndex((b) => b.id === beforeId);
    if (idx !== -1) return idx;
  }
  if (!rowId) return blocks.length;

  const inRow = blocks.filter((b) => rowIdOf(b) === rowId);
  const inCol = inRow.filter((b) => clampCol(b?.place?.col) === col);
  if (inCol.length) {
    return blocks.findIndex((b) => b.id === inCol[inCol.length - 1].id) + 1;
  }
  if (inRow.length) {
    return blocks.findIndex((b) => b.id === inRow[inRow.length - 1].id) + 1;
  }
  return blocks.length;
};

/**
 * Move (or add) a block into a row/column slot.
 *
 * `target.rowId` '' means a standalone full-width row. The dragged block keeps
 * its id, payload and style — only its position and placement change, which is
 * what makes drag, keyboard and panel edits share one code path.
 */
export const applyDropTarget = (blocks, blockId, target) => {
  const list = Array.isArray(blocks) ? blocks : [];
  const index = list.findIndex((b) => b.id === blockId);
  if (index === -1) return list;

  const withoutDragged = list.filter((b) => b.id !== blockId);
  const { rowId = '', col = 0, beforeId = null } = target || {};

  const moved = { ...list[index] };
  if (rowId) {
    moved.place = { rowId, col: clampCol(col) };
  } else {
    delete moved.place;
  }

  const at = slotInsertIndex(withoutDragged, rowId, clampCol(col), beforeId);
  const next = [...withoutDragged.slice(0, at), moved, ...withoutDragged.slice(at)];
  return withReindexedOrder(next);
};

/** Shift a block up/down in the flat order (keyboard + list fallback). */
export const moveBlockByOffset = (blocks, blockId, offset) => {
  const list = Array.isArray(blocks) ? blocks : [];
  const index = list.findIndex((b) => b.id === blockId);
  if (index === -1) return list;
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;

  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return withReindexedOrder(next);
};

/**
 * Step a block left/right between columns of its row (keyboard placement).
 * Stepping left out of column 0 detaches the block back to its own row.
 */
export const moveBlockToAdjacentColumn = (blocks, blockId, direction) => {
  const list = Array.isArray(blocks) ? blocks : [];
  const block = list.find((b) => b.id === blockId);
  if (!block) return list;

  const rowId = rowIdOf(block);
  if (!rowId) {
    if (direction < 0) return list;
    // Join the row above, if there is one directly before this block.
    const prev = list[list.findIndex((b) => b.id === blockId) - 1];
    const prevRowId = rowIdOf(prev);
    if (!prevRowId) return list;
    const used = list.filter((b) => rowIdOf(b) === prevRowId).map((b) => clampCol(b?.place?.col));
    const col = used.length ? Math.min(Math.max(...used) + 1, DETAIL_MAX_COLUMNS - 1) : 1;
    return applyDropTarget(list, blockId, { rowId: prevRowId, col });
  }

  const col = clampCol(block?.place?.col);
  if (direction < 0 && col === 0) {
    return applyDropTarget(list, blockId, { rowId: '', col: 0 });
  }
  const nextCol = Math.min(Math.max(col + direction, 0), DETAIL_MAX_COLUMNS - 1);
  return applyDropTarget(list, blockId, { rowId, col: nextCol });
};

/** Remove a block; deleted elements must never come back on reload. */
export const removeBlockById = (blocks, blockId) =>
  withReindexedOrder((Array.isArray(blocks) ? blocks : []).filter((b) => b.id !== blockId));

// ---------------------------------------------------------------------------
// Legacy field import
// ---------------------------------------------------------------------------

const hasPalette = (palette) => Boolean(palette?.heading || (palette?.colors || []).length);
const hasKeywords = (kw) => Boolean(kw?.heading || (kw?.items || []).length);

/**
 * Convert the legacy flat detail fields into builder blocks, in the same order
 * the public page used to render them. Read-only over the legacy fields: they
 * stay in the document so nothing is lost if the builder is never saved.
 */
export const blocksFromLegacyFields = (project) => {
  if (!project || typeof project !== 'object') return [];
  const blocks = [];
  const push = (type, payload) => {
    blocks.push({
      ...createDetailBlock(type, blocks.length, type),
      [type]: payload,
    });
  };

  if (hasPalette(project.palette)) {
    push('palette', {
      heading: project.palette.heading || 'Color Palette',
      colors: (project.palette.colors || []).map((c) => ({
        name: c.name || '',
        value: c.value || '',
        description: c.description || '',
      })),
    });
  }

  if (hasKeywords(project.keywords)) {
    push('keywords', {
      heading: project.keywords.heading || 'Keywords',
      items: (project.keywords.items || []).filter(Boolean),
    });
  }

  (project.lists || []).forEach((list) => {
    if (!list?.heading && !(list?.items || []).length && !list?.paragraph) return;
    push('lists', {
      heading: list.heading || '',
      paragraph: list.paragraph || '',
      items: (list.items || []).filter(Boolean),
    });
  });

  (project.sections || []).forEach((section) => {
    if (!section?.heading && !(section?.paragraphs || []).length && !section?.intro) return;
    push('sections', {
      heading: section.heading || '',
      intro: section.intro || '',
      paragraphs: (section.paragraphs || []).filter(Boolean),
    });
  });

  (project.imageBlocks || []).forEach((block) => {
    if (!block?.url && !block?.heading && !(block?.paragraphs || []).length) return;
    push('imageBlocks', {
      url: block.url || '',
      heading: block.heading || '',
      paragraphs: (block.paragraphs || []).filter(Boolean),
      subheadings: (block.subheadings || []).filter(Boolean),
      items: (block.items || []).filter(Boolean),
      caption: block.caption || '',
      layout: block.layout || '',
    });
  });

  // Flat heading/paragraph content blocks from the oldest editor.
  (project.contentBlocks || []).forEach((cb) => {
    if (cb?.type === 'heading' && cb.text) {
      push('sections', { heading: cb.text, intro: '', paragraphs: [] });
    } else if (cb?.type === 'paragraph' && cb.text) {
      push('sections', { heading: '', intro: '', paragraphs: [cb.text] });
    } else if (cb?.type === 'image' && cb.url) {
      push('imageBlocks', {
        url: cb.url,
        heading: '',
        paragraphs: [],
        subheadings: [],
        items: [],
        caption: '',
        layout: '',
      });
    }
  });

  return withReindexedOrder(blocks);
};

/** True when any legacy detail field still holds content. */
export const hasLegacyDetailContent = (project) =>
  Boolean(
    project &&
      (hasPalette(project.palette) ||
        hasKeywords(project.keywords) ||
        (project.lists || []).length ||
        (project.sections || []).length ||
        (project.imageBlocks || []).length ||
        (project.contentBlocks || []).length)
  );

// ---------------------------------------------------------------------------
// Style tokens -> Tailwind classes (literal strings so JIT can see them)
// ---------------------------------------------------------------------------

export const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const PADDING_CLASS = {
  none: '',
  sm: 'py-2',
  md: 'py-4',
  lg: 'py-8',
};

export const GAP_CLASS = {
  none: 'space-y-0',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-8',
};

export const ASPECT_CLASS = {
  auto: '',
  '16/9': 'aspect-video',
  '16/10': 'aspect-[16/10]',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '3/2': 'aspect-[3/2]',
};

/** Element width: always full width on mobile so 320px never overflows. */
export const WIDTH_CLASS = {
  auto: '',
  third: 'w-full sm:w-1/3',
  half: 'w-full sm:w-1/2',
  'two-thirds': 'w-full sm:w-2/3',
  'three-quarters': 'w-full sm:w-3/4',
  full: 'w-full',
};

export const LIST_STYLE_CLASS = {
  disc: 'list-disc',
  decimal: 'list-decimal',
  none: 'list-none',
  check: 'list-none',
};

/** Grid classes per column count: 1 on mobile, 2 from tablet, n from desktop. */
export const ROW_GRID_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export const HEADING_CLASS_BY_LEVEL = {
  1: 'font-abhaya text-3xl sm:text-4xl lg:text-5xl font-medium text-black leading-tight',
  2: 'font-abhaya text-2xl sm:text-3xl lg:text-4xl font-medium text-black',
  3: 'font-abhaya text-xl sm:text-2xl font-medium text-black',
  4: 'font-abhaya text-lg sm:text-xl font-medium text-black',
};

export const headingClassFor = (level) =>
  HEADING_CLASS_BY_LEVEL[Number(level)] || HEADING_CLASS_BY_LEVEL[2];

export const rowGridClass = (columnCount) =>
  ROW_GRID_CLASS[Math.min(Math.max(Math.trunc(Number(columnCount)) || 1, 1), DETAIL_MAX_COLUMNS)];

/** Inline style built only from validated tokens; never a raw string. */
export const inlineStyleFor = (style) => {
  if (!style) return undefined;
  const css = {};
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.color) css.color = style.color;
  if (style.background) css.backgroundColor = style.background;
  return Object.keys(css).length ? css : undefined;
};

/**
 * True when a block has anything visible. The public page skips empty blocks;
 * the builder canvas keeps rendering them so an element can be edited.
 */
export const blockHasContent = (block) => {
  const payload = block?.[block?.type];
  if (!payload || typeof payload !== 'object') return false;
  const some = (arr) => (Array.isArray(arr) ? arr.some((v) => String(v ?? '').trim()) : false);

  switch (block.type) {
    case 'palette':
      return Boolean(payload.heading) || (payload.colors || []).some((c) => c?.value);
    case 'keywords':
      return Boolean(payload.heading) || some(payload.items);
    case 'lists':
      return Boolean(payload.heading || payload.paragraph) || some(payload.items);
    case 'sections':
      return Boolean(payload.heading || payload.intro) || some(payload.paragraphs);
    case 'imageBlocks':
      return (
        Boolean(payload.url || payload.heading || payload.caption) ||
        some(payload.paragraphs) ||
        some(payload.subheadings) ||
        some(payload.items)
      );
    default:
      return false;
  }
};

/** Short label for the canvas card header. */
export const blockTitle = (block) => {
  const payload = block?.[block?.type] || {};
  const candidates = [
    payload.heading,
    (payload.paragraphs || [])[0],
    (payload.items || [])[0],
    (payload.subheadings || [])[0],
    (payload.colors || [])[0]?.name,
    block?.type ? DETAIL_BLOCK_TYPE_LABELS[block.type] : 'Block',
  ];
  const text = candidates.find((c) => typeof c === 'string' && c.trim());
  return text ? text.trim().slice(0, 60) : DETAIL_BLOCK_TYPE_LABELS[block?.type] || 'Block';
};
