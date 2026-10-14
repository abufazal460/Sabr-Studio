import React, { useEffect } from 'react';

const PRODUCTION_ORIGIN = 'https://sabrstudio.in';

/**
 * Pure React document head SEO component
 * Updates document.title, meta description, Open Graph tags, canonical link, and robots per page.
 */
export const Seo = ({
  title,
  description = 'Sabr Studio is an architecture, interior design, and bespoke furniture practice based in New Delhi.',
  ogImage = '/og-images/default-og-image.png',
  image, // fallback alias
  ogType = 'website',
  canonicalUrl,
  noIndex = false,
}) => {
  const fullTitle = title
    ? (title.includes('Sabr Studio') ? title : `${title} | Sabr Studio`)
    : 'Sabr Studio | Architecture & Interior Practice New Delhi';

  const finalImage = ogImage || image || '/og-images/default-og-image.png';

  useEffect(() => {
    // 1. Document Title
    document.title = fullTitle;

    // Helper for <meta name="..." content="...">
    const updateOrCreateMetaByName = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    // Helper for <meta property="..." content="...">
    const updateOrCreateMetaByProperty = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    // 2. Meta description
    updateOrCreateMetaByName('description', description);

    // 3. Robots meta (noindex for admin / private pages)
    updateOrCreateMetaByName('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // 4. Canonical URL (always https://sabrstudio.in/...)
    let canonicalHref = canonicalUrl;
    if (!canonicalHref) {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      canonicalHref = `${PRODUCTION_ORIGIN}${pathname === '/' ? '' : pathname}`;
    } else if (canonicalHref.startsWith('/')) {
      canonicalHref = `${PRODUCTION_ORIGIN}${canonicalHref}`;
    }

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalHref;

    // 5. Open Graph tags
    updateOrCreateMetaByProperty('og:title', fullTitle);
    updateOrCreateMetaByProperty('og:description', description);
    updateOrCreateMetaByProperty('og:type', ogType);
    updateOrCreateMetaByProperty('og:url', canonicalHref);

    if (finalImage) {
      const absoluteImageUrl = finalImage.startsWith('http')
        ? finalImage
        : `${PRODUCTION_ORIGIN}${finalImage.startsWith('/') ? '' : '/'}${finalImage}`;
      updateOrCreateMetaByProperty('og:image', absoluteImageUrl);
    }
  }, [fullTitle, description, finalImage, ogType, canonicalUrl, noIndex]);

  return null;
};

export default Seo;
