/**
 * Appends f_auto, q_auto and width/height transforms to Cloudinary URLs.
 * Gracefully preserves non-Cloudinary URLs or fallback placeholders.
 */
export const buildCloudinaryUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string') {
    return 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80';
  }

  // If it's a Cloudinary URL:
  if (url.includes('res.cloudinary.com')) {
    const { width, height, crop = 'fill' } = options;
    const transforms = ['f_auto', 'q_auto'];

    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (width || height) transforms.push(`c_${crop}`);

    const transformString = transforms.join(',');

    // Insert transform parameters after /upload/
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/${transformString}/`);
    }
  }

  // If it's an Unsplash URL:
  if (url.includes('images.unsplash.com')) {
    const { width, height } = options;
    let modified = url;
    if (width && !modified.includes('w=')) {
      modified += `&w=${width}`;
    }
    if (height && !modified.includes('h=')) {
      modified += `&h=${height}`;
    }
    return modified;
  }

  return url;
};
