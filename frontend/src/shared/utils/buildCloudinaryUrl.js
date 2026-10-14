/**
 * Cloudinary delivery-URL helper (Work 04).
 *
 * Builds optimized delivery URLs: `f_auto,q_auto` (automatic format + quality)
 * plus a `w_<width>` cap so public pages never download full-size originals.
 *
 * There is deliberately NO placeholder image. A missing/empty image returns ''
 * so the caller can decide (skip the <img>, show a surface block) instead of
 * the site silently serving a stock photo that is not the studio's work.
 *
 * Non-Cloudinary URLs (legacy Unsplash links stored before real uploads) are
 * passed through untouched, with the same width/height hints appended where the
 * host understands them, so old records keep rendering.
 */

const CLOUDINARY_HOSTS = ['res.cloudinary.com'];

/** Transform segment already present in a Cloudinary URL, if any. */
function existingTransform(url) {
  const match = url.match(/\/upload\/([^/]+)\//);
  if (!match) return null;
  const segment = match[1];
  // A bare version number (v1234567) is not a transform segment.
  if (/^v\d+$/.test(segment)) return null;
  return segment;
}

function isCloudinaryUrl(url) {
  return CLOUDINARY_HOSTS.some((host) => url.includes(host));
}

/**
 * @param {string} url            Cloudinary secure_url, a publicId, or a legacy URL
 * @param {object} [options]
 * @param {number} [options.width]   max rendered width in px (adds w_<width>)
 * @param {number} [options.height]  max rendered height in px (adds h_<height>)
 * @param {string} [options.crop]    crop mode when a size is given (default 'fill')
 * @returns {string} optimized URL, or '' when there is no image
 */
export const buildCloudinaryUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '';
  }

  const source = url.trim();

  // Not an absolute URL (e.g. a bare public_id or a local path): pass through.
  if (!/^https?:\/\//i.test(source)) {
    return source;
  }

  if (isCloudinaryUrl(source)) {
    const { width, height, crop = 'fill' } = options;
    const transforms = ['f_auto', 'q_auto'];

    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if ((width || height) && crop) transforms.push(`c_${crop}`);

    const existing = existingTransform(source);

    if (existing) {
      // Already transformed: add only the transform kinds that are missing so
      // callers never stack duplicate w_/c_ segments onto the same URL.
      const merged = existing.split(',');
      transforms.forEach((t) => {
        const key = t.split('_')[0];
        if (!merged.some((tok) => tok.split('_')[0] === key)) merged.push(t);
      });
      return source.replace(`/upload/${existing}/`, `/upload/${merged.join(',')}/`);
    }

    if (source.includes('/upload/')) {
      return source.replace('/upload/', `/upload/${transforms.join(',')}/`);
    }
  }

  // Legacy non-Cloudinary host: keep it working, add width/height hints where
  // the host understands them (Unsplash uses its own query params).
  if (source.includes('images.unsplash.com')) {
    const { width, height } = options;
    let modified = source;
    if (width && !/[?&]w=/.test(modified)) {
      modified += `${modified.includes('?') ? '&' : '?'}w=${width}`;
    }
    if (height && !/[?&]h=/.test(modified)) {
      modified += `${modified.includes('?') ? '&' : '?'}h=${height}`;
    }
    return modified;
  }

  return source;
};

/**
 * Build a `srcset` for responsive delivery from one Cloudinary URL.
 * @param {string} url
 * @param {number[]} widths pixel widths to generate
 * @returns {string} srcset value, or '' when there is no image
 */
export const buildCloudinarySrcSet = (url, widths = [400, 800, 1200, 1800]) => {
  return widths
    .map((w) => {
      const built = buildCloudinaryUrl(url, { width: w });
      return built ? `${built} ${w}w` : '';
    })
    .filter(Boolean)
    .join(', ');
};

export default buildCloudinaryUrl;
