/**
 * Work 04 verification — part 2: the Cloudinary delivery-URL helper.
 *
 * Asserts the public-page helper adds f_auto,q_auto + a width cap, never
 * duplicates transforms, never returns a placeholder image for an empty input,
 * and still renders legacy Unsplash records.
 *
 * The helper is plain ESM with no framework imports, so it is imported directly.
 */
import { buildCloudinaryUrl, buildCloudinarySrcSet } from '../frontend/src/shared/utils/buildCloudinaryUrl.js';

const results = [];
const check = (id, ok, detail) => {
  results.push({ id, ok });
  console.log(`[${ok ? ' PASS ' : ' FAIL '}] ${id} — ${detail}`);
};

const CLOUD =
  'https://res.cloudinary.com/demo/image/upload/v1699999999/sabrstudio/projects/abc123.jpg';

// 1. Empty / missing image must NOT produce a placeholder image URL.
check('empty input -> empty string (no placeholder)', buildCloudinaryUrl('') === '', `got "${buildCloudinaryUrl('')}"`);
check('null input -> empty string', buildCloudinaryUrl(null) === '', `got "${buildCloudinaryUrl(null)}"`);
check('undefined input -> empty string', buildCloudinaryUrl(undefined) === '', 'ok');

// 2. f_auto + q_auto + width are injected.
const sized = buildCloudinaryUrl(CLOUD, { width: 1200, height: 800 });
check('adds f_auto,q_auto', sized.includes('f_auto') && sized.includes('q_auto'), sized);
check('adds width cap w_1200', sized.includes('w_1200'), sized);
check('adds height h_800', sized.includes('h_800'), sized);
check('adds crop c_fill when sized', sized.includes('c_fill'), sized);
check('inserted right after /upload/', sized.includes('/upload/f_auto,q_auto,w_1200,h_800,c_fill/'), sized);

// 3. No size given -> still optimized, but no width/crop noise.
const nosize = buildCloudinaryUrl(CLOUD);
check('no size -> f_auto,q_auto only', nosize === CLOUD.replace('/upload/', '/upload/f_auto,q_auto/'), nosize);

// 4. Idempotent: re-transforming must not stack duplicate segments.
const twice = buildCloudinaryUrl(sized, { width: 400 });
const seg = twice.match(/\/upload\/([^/]+)\//)[1];
const wCount = seg.split(',').filter((t) => t.startsWith('w_')).length;
check('re-transform does not duplicate w_', wCount === 1, `segment="${seg}" w_count=${wCount}`);

// 5. Legacy Unsplash records keep rendering (width hint appended).
const legacy = buildCloudinaryUrl('https://images.unsplash.com/photo-123?auto=format&fit=crop', {
  width: 700,
});
check('legacy Unsplash URL preserved + width hint', legacy.includes('images.unsplash.com') && legacy.includes('w=700'), legacy);

// 6. srcset builder produces responsive candidates.
const srcset = buildCloudinarySrcSet(CLOUD, [400, 800]);
check('srcset has 2 candidates', srcset.split(/,\s(?=https?:)/).length === 2, srcset);
check('srcset candidate widths correct', srcset.includes('400w') && srcset.includes('800w'), srcset);
check('srcset empty for missing image', buildCloudinarySrcSet('') === '', 'ok');

// 7. No Unsplash fallback string survives anywhere in the helper output.
const all = [buildCloudinaryUrl(''), buildCloudinaryUrl(null), buildCloudinaryUrl(CLOUD, { width: 10 })];
check('no hardcoded Unsplash placeholder returned', all.every((u) => u !== 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'), 'ok');

const passed = results.filter((r) => r.ok).length;
console.log('\n' + '='.repeat(72));
console.log(`WORK 04 URL HELPER VERIFICATION: ${passed}/${results.length} checks passed`);
console.log('='.repeat(72));
process.exit(passed === results.length ? 0 : 1);
