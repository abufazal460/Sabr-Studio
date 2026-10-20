import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  'test-secret-for-unit-tests-and-long-enough-to-pass-32-char-check';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_EMAIL = 'unit@test.local';
process.env.ADMIN_PASSWORD = 'unit-test-password-12345';
process.env.ADMIN_NAME = 'Unit Admin';
process.env.RAZORPAY_KEY_ID = 'key_test_mock';
process.env.MONGODB_URI = '';

const { default: app } = await import('../app.js');
const { isValidCSSColor } = await import('../utils/colorValidator.js');
const request = supertest(app);

const ADMIN_LOGIN = { email: 'unit@test.local', password: 'unit-test-password-12345' };

describe('Project Keywords & Color Palette Backend Suite', () => {
  const getAdminCookie = async () => {
    const res = await request
      .post('/api/auth/login')
      .send(ADMIN_LOGIN);
    assert.equal(res.status, 200, 'Login failed');
    const cookie = res.headers['set-cookie'];
    assert.ok(cookie, 'No set-cookie returned');
    return cookie;
  };

  describe('CSS Color Validator Unit Tests', () => {
    it('accepts valid HEX colors including 3, 4, 6, and 8 digits with alpha', () => {
      assert.ok(isValidCSSColor('#FFF'));
      assert.ok(isValidCSSColor('#FFFF'));
      assert.ok(isValidCSSColor('#D9C7B8'));
      assert.ok(isValidCSSColor('#D9C7B880'));
      assert.ok(isValidCSSColor('#00000000'));
    });

    it('accepts valid RGB and RGBA colors including alpha transparency', () => {
      assert.ok(isValidCSSColor('rgb(217, 199, 184)'));
      assert.ok(isValidCSSColor('rgba(217, 199, 184, 0.5)'));
      assert.ok(isValidCSSColor('rgb(255 255 255 / 0.8)'));
      assert.ok(isValidCSSColor('rgba(0, 0, 0, 1)'));
      assert.ok(isValidCSSColor('rgb(100%, 50%, 0%)'));
    });

    it('accepts valid CSS named colors including burlywood and transparent', () => {
      assert.ok(isValidCSSColor('burlywood'));
      assert.ok(isValidCSSColor('black'));
      assert.ok(isValidCSSColor('white'));
      assert.ok(isValidCSSColor('transparent'));
      assert.ok(isValidCSSColor('cornflowerblue'));
    });

    it('rejects invalid color strings, out-of-range channels, and non-color keywords', () => {
      assert.equal(isValidCSSColor('not-a-color'), false);
      assert.equal(isValidCSSColor('#12'), false);
      assert.equal(isValidCSSColor('#12345'), false);
      assert.equal(isValidCSSColor('#GGG'), false);
      assert.equal(isValidCSSColor('rgb(999, 0, 0)'), false);
      assert.equal(isValidCSSColor('rgb(255)'), false);
      assert.equal(isValidCSSColor('rgba(255, 0, 0, 1.5)'), false);
      assert.equal(isValidCSSColor(''), false);
      assert.equal(isValidCSSColor(null), false);
    });
  });

  describe('Admin Authorization & Validation', () => {
    it('rejects unauthenticated project creation', async () => {
      const res = await request
        .post('/api/admin/projects')
        .send({
          title: 'Unauthorized Project',
          description: 'Test description',
        });
      assert.equal(res.status, 401);
    });

    it('rejects project creation when keyword heading is missing or blank', async () => {
      const cookie = await getAdminCookie();
      const res = await request
        .post('/api/admin/projects')
        .set('Cookie', cookie)
        .send({
          title: 'Project Missing Keyword Heading',
          description: 'A test project with missing keyword heading',
          keywords: {
            heading: '   ',
            items: ['Natural oak', 'Limewash'],
          },
        });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes('Validation failed'));
    });

    it('rejects project creation when keyword items array is empty or contains only whitespace', async () => {
      const cookie = await getAdminCookie();
      const resEmpty = await request
        .post('/api/admin/projects')
        .set('Cookie', cookie)
        .send({
          title: 'Project Empty Keyword Items',
          description: 'A test project with empty keyword items',
          keywords: {
            heading: 'Materials',
            items: [],
          },
        });
      assert.equal(resEmpty.status, 400);

      const resBlank = await request
        .post('/api/admin/projects')
        .set('Cookie', cookie)
        .send({
          title: 'Project Blank Keyword Item',
          description: 'A test project with whitespace keyword item',
          keywords: {
            heading: 'Materials',
            items: ['   '],
          },
        });
      assert.equal(resBlank.status, 400);
    });

    it('rejects project creation when color palette contains invalid CSS colors', async () => {
      const cookie = await getAdminCookie();
      const res = await request
        .post('/api/admin/projects')
        .set('Cookie', cookie)
        .send({
          title: 'Project Invalid Color',
          description: 'A test project with invalid color in palette',
          palette: {
            heading: 'Color Palette',
            colors: [
              { name: 'Good Color', value: '#D9C7B8' },
              { name: 'Bad Color', value: 'invalid-css-color-xyz' },
            ],
          },
        });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes('Validation failed'));
    });
  });

  describe('Project CRUD Flow with Keywords & Color Palette', () => {
    let createdProjectId = '';
    let createdProjectSlug = '';

    it('creates a project with valid keywords list and valid palette', async () => {
      const cookie = await getAdminCookie();
      const newProj = {
        title: `Dynamic Test Project ${Date.now()}`,
        description: 'Architectural masterpiece crafted with brutalist precision and tactile materiality.',
        category: 'Residential',
        published: true,
        keywords: {
          heading: 'Architectural Keywords',
          items: ['Brutalist Geometry', 'Smoked Oak', 'Acoustic Limewash'],
        },
        palette: {
          heading: 'Material & Color Palette',
          colors: [
            { name: 'Warm Alabaster', value: '#D9C7B8' },
            { name: 'Translucent Amber', value: '#D9C7B880' },
            { name: 'Earthy Ochre', value: 'rgb(217, 199, 184)' },
            { name: 'Shadow Charcoal', value: 'rgba(217, 199, 184, 0.5)' },
            { name: 'Raw Burlywood', value: 'burlywood' },
            { value: '#111111' }, // Optional color name omitted!
          ],
        },
      };

      const res = await request
        .post('/api/admin/projects')
        .set('Cookie', cookie)
        .send(newProj);

      assert.equal(res.status, 201);
      assert.ok(res.body.data);
      createdProjectId = res.body.data.id || res.body.data._id;
      createdProjectSlug = res.body.data.slug;

      assert.equal(res.body.data.keywords.heading, 'Architectural Keywords');
      assert.deepEqual(res.body.data.keywords.items, [
        'Brutalist Geometry',
        'Smoked Oak',
        'Acoustic Limewash',
      ]);

      assert.equal(res.body.data.palette.heading, 'Material & Color Palette');
      assert.equal(res.body.data.palette.colors.length, 6);
      assert.equal(res.body.data.palette.colors[0].name, 'Warm Alabaster');
      assert.equal(res.body.data.palette.colors[0].value, '#D9C7B8');
      assert.equal(res.body.data.palette.colors[5].name, '');
      assert.equal(res.body.data.palette.colors[5].value, '#111111');
    });

    it('retrieves the created project via public API with keywords and palette intact', async () => {
      assert.ok(createdProjectSlug, 'Created project slug must exist');
      const res = await request.get(`/api/projects/${createdProjectSlug}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.keywords.heading, 'Architectural Keywords');
      assert.equal(res.body.data.keywords.items.length, 3);
      assert.equal(res.body.data.palette.heading, 'Material & Color Palette');
      assert.equal(res.body.data.palette.colors.length, 6);
    });

    it('updates project keywords and reorders/modifies palette entries', async () => {
      const cookie = await getAdminCookie();
      const updateData = {
        keywords: {
          heading: 'Updated Material Specifications',
          items: ['Handmade Terracotta', 'Recycled Teak'],
        },
        palette: {
          heading: 'Edited Palette',
          colors: [
            { name: 'Sandstone', value: 'burlywood' },
            { name: '', value: '#FFFFFF' },
          ],
        },
      };

      const res = await request
        .put(`/api/admin/projects/${createdProjectId}`)
        .set('Cookie', cookie)
        .send(updateData);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.keywords.heading, 'Updated Material Specifications');
      assert.deepEqual(res.body.data.keywords.items, ['Handmade Terracotta', 'Recycled Teak']);
      assert.equal(res.body.data.palette.colors.length, 2);
      assert.equal(res.body.data.palette.colors[0].name, 'Sandstone');
    });

    it('supports saving project without palette or clearing palette', async () => {
      const cookie = await getAdminCookie();
      const res = await request
        .put(`/api/admin/projects/${createdProjectId}`)
        .set('Cookie', cookie)
        .send({ palette: null });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.palette, null);
    });

    it('supports backward compatibility for existing projects without keywords or palette', async () => {
      // proj-2 in fallback store does not have keywords or palette
      const res = await request.get('/api/projects/studio-pavilion');
      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.ok(!res.body.data.keywords || res.body.data.keywords.items?.length === 0);
      assert.ok(!res.body.data.palette || res.body.data.palette.colors?.length === 0);
    });
  });
});
