import React, { useEffect } from 'react';

/**
 * Pure React document head SEO component (02-frontend.md §19)
 * Updates document.title, meta description, Open Graph tags, and canonical link per page.
 */
export const Seo = ({
  title,
  description = 'Sabr Studio is an architecture, interior design, and bespoke furniture practice based in New Delhi.',
  ogImage = '/assets/brand/sabr-logo-dark.svg',
  ogType = 'website',
  canonicalUrl,
}) => {
  const fullTitle = title
    ? `${title} | Sabr Studio`
    : 'Sabr Studio | Architecture & Interior Practice New Delhi';

  useEffect(() => {
    // 1. Document Title
    document.title = fullTitle;

    // 2. Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // 3. Open Graph
    const updateOrCreateMeta = (property, content) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    updateOrCreateMeta('og:title', fullTitle);
    updateOrCreateMeta('og:description', description);
    updateOrCreateMeta('og:type', ogType);
    if (ogImage) {
      updateOrCreateMeta('og:image', ogImage);
    }

    // 4. Canonical URL
    if (canonicalUrl && typeof window !== 'undefined') {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.rel = 'canonical';
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = canonicalUrl || window.location.href;
    }
  }, [fullTitle, description, ogImage, ogType, canonicalUrl]);

  return null;
};

export default Seo;
