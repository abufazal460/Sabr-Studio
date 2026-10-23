/**
 * Regression test: project image-block persistence (Work: image URL fix).
 *
 * The frontend always sent `url` on image blocks, but the Mongoose sub-schema
 * omitted it. Mongoose runs in strict mode by default, so `url` was silently
 * stripped on every create/update and the image never rendered publicly.
 *
 * This test locks the whole chain:
 *   1. Mongoose schema keeps `url` (the original bug).
 *   2. The service create path preserves `url`.
 *   3. The service update path preserves `url`.
 *   4. The validator accepts `url` and rejects a non-string `url`.
 *
 * Run with: node backend/tests/project-image-blocks.test.js
 */

import assert from 'node:assert/strict';
import { Project } from '../models/project.model.js';
import { projectService } from '../services/project.service.js';

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    process.stdout.write(`  PASS  ${name}\n`);
  } catch (err) {
    failed += 1;
    process.stderr.write(`  FAIL  ${name}\n`);
    process.stderr.write(`        ${err.message}\n`);
  }
};

const CLOUDINARY_URL =
  'https://res.cloudinary.com/demo/image/upload/sabrstudio/hero.jpg';
const DIRECT_URL = 'https://example.com/photo.jpg';

process.stdout.write('\nproject image-block persistence\n');

await test('mongoose schema keeps url on image blocks', () => {
  const doc = new Project({
    title: 'Schema Check',
    slug: 'schema-check',
    description: 'desc',
    imageBlocks: [{ url: CLOUDINARY_URL, heading: 'Heading' }],
  });
  const block = doc.toObject().imageBlocks[0];
  assert.equal(block.url, CLOUDINARY_URL, 'url was stripped by the schema');
});

await test('image block url defaults to empty string', () => {
  const doc = new Project({
    title: 'Default Check',
    slug: 'default-check',
    description: 'desc',
    imageBlocks: [{ heading: 'Heading' }],
  });
  assert.equal(doc.toObject().imageBlocks[0].url, '');
});

await test('create path preserves cloudinary and direct urls', async () => {
  const created = await projectService.createProject({
    title: 'Create Check',
    description: 'desc',
    imageBlocks: [
      { url: CLOUDINARY_URL, heading: 'Cloudinary' },
      { url: DIRECT_URL, heading: 'Direct' },
    ],
  });

  const blocks = created.imageBlocks;
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].url, CLOUDINARY_URL);
  assert.equal(blocks[1].url, DIRECT_URL);
});

await test('create path trims whitespace around url', async () => {
  const created = await projectService.createProject({
    title: 'Trim Check',
    description: 'desc',
    imageBlocks: [{ url: `  ${DIRECT_URL}  ` }],
  });
  assert.equal(created.imageBlocks[0].url, DIRECT_URL);
});

await test('update path preserves url', async () => {
  const created = await projectService.createProject({
    title: 'Update Check',
    description: 'desc',
    imageBlocks: [{ url: CLOUDINARY_URL, heading: 'Before' }],
  });

  const id = created.id || created._id;
  const updated = await projectService.updateProject(id, {
    imageBlocks: [{ url: DIRECT_URL, heading: 'After' }],
  });

  assert.equal(updated.imageBlocks[0].url, DIRECT_URL);
  assert.equal(updated.imageBlocks[0].heading, 'After');
});

await test('validator accepts a string url on image blocks', async () => {
  const { validateImageBlocks } = await import('../validators/project.validator.js');
  assert.equal(validateImageBlocks([{ url: DIRECT_URL }]), true);
});

await test('validator rejects a non-string url on image blocks', async () => {
  const { validateImageBlocks } = await import('../validators/project.validator.js');
  assert.throws(
    () => validateImageBlocks([{ url: 123 }]),
    /Image block url must be a string/
  );
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
