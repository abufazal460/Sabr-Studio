/**
 * Regression test: dynamic Project Details builder persistence.
 *
 * The builder stores an ordered `detailBlocks` array. Beyond the payload of
 * each block it now persists:
 *   - `place`  { rowId, col }  -> which section row / column the element sits in
 *   - `style`  { align, width, ... } -> per-element presentation tokens
 *
 * This test locks the guarantees the drag-and-drop UI depends on:
 *   1. The Mongoose schema does not strip place/style (strict mode bug class).
 *   2. The service normaliser clamps or drops malformed placement and styles,
 *      so a crafted value can never be persisted and replayed as inline CSS.
 *   3. Drag order survives persistence (array order == `order`).
 *   4. Legacy blocks with no place/style still round-trip (backward compat).
 *   5. The row/column grouping used by the canvas and the public page agrees.
 *
 * Run with: node backend/tests/project-detail-blocks.test.js
 */

import assert from 'node:assert/strict';
import { Project } from '../models/project.model.js';
import { projectService } from '../services/project.service.js';
import { groupBlocksIntoRows } from '../utils/detailBlockSpec.js';

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
};

const sectionBlock = (id, heading, extra = {}) => ({
  id,
  type: 'sections',
  order: 0,
  sections: { heading, intro: '', paragraphs: ['p'] },
  ...extra,
});

console.log('\nproject detail-block builder persistence\n');

await test('mongoose schema keeps place and style on detail blocks', () => {
  const doc = new Project({
    title: 'Schema Check',
    slug: 'schema-check',
    description: 'desc',
    detailBlocks: [
      sectionBlock('b1', 'Left', {
        place: { rowId: 'row-1', col: 0 },
        style: { align: 'left', width: 'half', fontSize: '18px', headingLevel: 3 },
      }),
      sectionBlock('b2', 'Right', {
        place: { rowId: 'row-1', col: 1 },
        style: { align: 'right', color: '#333333', listStyle: 'disc' },
      }),
    ],
  });

  const blocks = doc.toObject().detailBlocks;
  assert.equal(blocks[0].place.rowId, 'row-1');
  assert.equal(blocks[1].place.col, 1);
  assert.equal(blocks[0].style.width, 'half');
  assert.equal(blocks[0].style.headingLevel, 3);
  assert.equal(blocks[1].style.color, '#333333');
});

await test('create path stores placement so a row keeps two columns', async () => {
  const created = await projectService.createProject({
    title: 'Row Check',
    description: 'desc',
    detailBlocks: [
      sectionBlock('b1', 'Left', { place: { rowId: 'r1', col: 0 } }),
      sectionBlock('b2', 'Right', { place: { rowId: 'r1', col: 1 } }),
    ],
  });

  const blocks = created.detailBlocks;
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].place.col, 0);
  assert.equal(blocks[1].place.col, 1);

  const rows = groupBlocksIntoRows(blocks);
  assert.equal(rows.length, 1, 'consecutive blocks in one rowId must form a single row');
  assert.equal(rows[0].columns.length, 2);
  assert.equal(rows[0].columns[1][0].id, 'b2');
});

await test('standalone blocks have no place and render as their own row', async () => {
  const created = await projectService.createProject({
    title: 'Standalone Check',
    description: 'desc',
    detailBlocks: [sectionBlock('b1', 'One'), sectionBlock('b2', 'Two')],
  });

  assert.equal(created.detailBlocks[0].place, undefined);
  const rows = groupBlocksIntoRows(created.detailBlocks);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.columns.length === 1));
});

await test('normaliser drops unknown and crafted style values', async () => {
  const created = await projectService.createProject({
    title: 'Style Safety Check',
    description: 'desc',
    detailBlocks: [
      sectionBlock('b1', 'Safe', {
        style: {
          align: 'center',
          width: 'half',
          fontSize: '18px',
          color: '#F4EFEA',
          // not whitelisted / not a valid token
          position: 'fixed',
          expression: 'url(javascript:alert(1))',
          listStyle: 'bullets-∞',
          background: 'rgba(0,0,0,0.5); color: red',
          headingLevel: 9,
        },
      }),
    ],
  });

  const style = created.detailBlocks[0].style;
  assert.equal(style.align, 'center');
  assert.equal(style.width, 'half');
  assert.equal(style.fontSize, '18px');
  assert.equal(style.color, '#F4EFEA');
  assert.equal(style.position, undefined);
  assert.equal(style.expression, undefined);
  assert.equal(style.listStyle, '');
  assert.equal(style.background, '');
  assert.equal(style.headingLevel, 0);
});

await test('normaliser clamps out-of-range columns and rejects bad row ids', async () => {
  const created = await projectService.createProject({
    title: 'Place Safety Check',
    description: 'desc',
    detailBlocks: [
      sectionBlock('b1', 'Clamped', { place: { rowId: 'r1', col: 99 } }),
      sectionBlock('b2', 'BadId', { place: { rowId: '<script>', col: 1 } }),
    ],
  });

  assert.equal(created.detailBlocks[0].place.col, 2, 'col must clamp to the last column');
  // An invalid rowId makes the slot meaningless: the block falls back to a
  // standalone row instead of joining a partially-formed section.
  assert.equal(created.detailBlocks[1].place, undefined);

  const rows = groupBlocksIntoRows(created.detailBlocks);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.columns.length <= 3));
});

await test('drag order survives persistence', async () => {
  const created = await projectService.createProject({
    title: 'Order Check',
    description: 'desc',
    // Reversed order values: the array order is what the builder drags.
    detailBlocks: [
      sectionBlock('b3', 'Third', { order: 0 }),
      sectionBlock('b1', 'First', { order: 7 }),
      sectionBlock('b2', 'Second', { order: 2 }),
    ],
  });

  const blocks = created.detailBlocks;
  assert.deepEqual(
    blocks.map((b) => b.id),
    ['b3', 'b1', 'b2']
  );
  assert.deepEqual(
    blocks.map((b) => b.order),
    [0, 1, 2]
  );
});

await test('update path replaces placement without leaving stale columns', async () => {
  const created = await projectService.createProject({
    title: 'Update Check',
    description: 'desc',
    detailBlocks: [
      sectionBlock('b1', 'Left', { place: { rowId: 'r1', col: 0 } }),
      sectionBlock('b2', 'Right', { place: { rowId: 'r1', col: 1 } }),
    ],
  });

  const updated = await projectService.updateProject(created.id || created._id, {
    // b2 deleted, b1 made standalone again.
    detailBlocks: [sectionBlock('b1', 'Solo')],
  });

  assert.equal(updated.detailBlocks.length, 1);
  assert.equal(updated.detailBlocks[0].id, 'b1');
  assert.equal(updated.detailBlocks[0].place, undefined);
  const rows = groupBlocksIntoRows(updated.detailBlocks);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].columns.length, 1);
});

await test('legacy detail blocks without place or style still save', async () => {
  const created = await projectService.createProject({
    title: 'Legacy Check',
    description: 'desc',
    detailBlocks: [
      { id: 'old1', type: 'palette', order: 0, palette: { heading: 'Palette', colors: [{ name: 'Ink', value: '#111111' }] } },
      { id: 'old2', type: 'keywords', order: 1, keywords: { heading: 'Tags', items: ['a'] } },
    ],
  });

  assert.equal(created.detailBlocks.length, 2);
  assert.equal(created.detailBlocks[0].palette.colors[0].value, '#111111');
  assert.equal(created.detailBlocks[1].keywords.items[0], 'a');
});

await test('validator accepts a block with valid place and style', async () => {
  const { validateDetailBlocks } = await import('../validators/project.validator.js');
  assert.equal(
    validateDetailBlocks([
      sectionBlock('b1', 'Valid', {
        place: { rowId: 'row_2', col: 2 },
        style: { align: 'right', width: 'third', aspect: '16/9', headingLevel: 2 },
      }),
    ]),
    true
  );
});

await test('validator rejects unknown style tokens and bad placement', async () => {
  const { validateBlockPlace, validateBlockStyle } = await import(
    '../validators/project.validator.js'
  );

  assert.throws(() => validateBlockStyle({ align: 'justify' }), /style align must be one of/);
  assert.throws(() => validateBlockStyle({ fontSize: '12px; color: red' }), /fontSize must be/);
  assert.throws(() => validateBlockStyle({ color: 'not-a-color' }), /color must be a valid CSS/);
  assert.throws(() => validateBlockPlace({ col: 5 }), /col must be 0\.\./);
  assert.throws(() => validateBlockPlace({ rowId: 'has space' }), /rowId must be a string/);
  // Tailwind's scale uses three-decimal sizes, so they must be accepted.
  validateBlockStyle({ fontSize: '1.125rem' });
  assert.throws(() => validateBlockStyle({ fontSize: '1.125remx' }), /fontSize must be/);
});

// The builder reads a project back, edits one field and PUTs the whole array,
// so every token the normaliser emits must also pass the validator.
await test('a style the normaliser wrote always survives a round-trip save', async () => {
  const { normalizeBlockStyle } = await import('../utils/detailBlockSpec.js');
  const { validateBlockStyle } = await import('../validators/project.validator.js');

  const stored = normalizeBlockStyle({ fontSize: '', align: 'left', background: '#F6F1EA' });
  assert.equal(stored.fontSize, '', 'cleared font size is stored as an empty token');
  assert.equal(stored.headingLevel, 0, 'unset heading level is stored as 0');
  validateBlockStyle(stored);

  assert.throws(() => validateBlockStyle({ headingLevel: 5 }), /headingLevel must be one of/);
});

await test('groupBlocksIntoRows never leaves a phantom leading column', () => {
  const rows = groupBlocksIntoRows([
    { id: 'a', place: { rowId: 'r1', col: 2 } },
    { id: 'b', place: { rowId: 'r1', col: 2 } },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].columns.length, 1, 'unused columns must not be materialised');
  assert.deepEqual(rows[0].columns[0].map((b) => b.id), ['a', 'b']);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
