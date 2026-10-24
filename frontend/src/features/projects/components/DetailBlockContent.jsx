import { useState } from 'react';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import {
  ALIGN_CLASS,
  ASPECT_CLASS,
  GAP_CLASS,
  LIST_STYLE_CLASS,
  PADDING_CLASS,
  WIDTH_CLASS,
  blockHasContent,
  groupBlocksIntoRows,
  headingClassFor,
  rowGridClass,
} from '../../../shared/utils/detailBuilder';

/**
 * Renders one Project Details builder element.
 *
 * Shared by the admin builder canvas and the public project page, so what the
 * admin arranges is literally the component a visitor sees — there is no
 * separate preview to drift away from the public layout.
 *
 * `block.style` only ever holds tokens the backend whitelisted, so the inline
 * CSS built here can never contain a client-crafted value.
 */

const cx = (...parts) => parts.filter(Boolean).join(' ');

const contentStyle = (style) => {
  if (!style) return undefined;
  const css = {};
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.color) css.color = style.color;
  if (style.background) css.backgroundColor = style.background;
  return Object.keys(css).length ? css : undefined;
};

/**
 * Inline style for the text itself. The wrapper cannot carry these: the
 * elements' own `text-sm`/`text-ink` classes would outrank an inherited value.
 */
const textStyle = (style) => {
  const css = {};
  if (style?.fontSize) css.fontSize = style.fontSize;
  if (style?.color) css.color = style.color;
  return Object.keys(css).length ? css : undefined;
};

const bodyClass = (style) =>
  cx('font-inter text-sm sm:text-base leading-relaxed', ALIGN_CLASS[style?.align]);

const wrapperClass = (style) =>
  cx('min-w-0 space-y-3', WIDTH_CLASS[style?.width], ALIGN_CLASS[style?.align], PADDING_CLASS[style?.padding]);

const Heading = ({ text, style }) => {
  if (!text) return null;
  const level = Math.min(Math.max(Number(style?.headingLevel) || 2, 1), 4);
  const Tag = `h${level}`;
  return (
    <Tag className={cx(headingClassFor(level), ALIGN_CLASS[style?.align])} style={textStyle(style)}>
      {text}
    </Tag>
  );
};

/** Bullet list; the "check" style renders its own markers. */
const ItemsList = ({ items, style }) => {
  if (!items?.length) return null;
  const listStyle = style?.listStyle || 'disc';

  if (listStyle === 'check') {
    return (
      <ul className="space-y-2 text-left">
        {items.map((item, idx) => (
          <li key={idx} className={cx('flex items-start gap-2', bodyClass(style))} style={textStyle(style)}>
            <span aria-hidden="true" className="mt-[2px] shrink-0">
              ✓
            </span>
            <span>{String(item).trim()}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cx('space-y-2 pl-5 sm:pl-7 text-left', LIST_STYLE_CLASS[listStyle])}>
      {items.map((item, idx) => (
        <li key={idx} className={cx('text-ink', bodyClass(style))} style={textStyle(style)}>
          {String(item).trim()}
        </li>
      ))}
    </ul>
  );
};

const Swatch = ({ color, style }) => (
  <div className="flex flex-col items-center gap-2 text-center group">
    <div
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-border shadow-xs transition-transform duration-200 group-hover:scale-105"
      style={{ backgroundColor: color.value }}
      aria-label={color.name || color.value}
      title={color.name ? `${color.name} (${color.value})` : color.value}
    />
    {color.name && (
      <span
        className="font-inter text-xs sm:text-sm text-ink max-w-[120px] break-words"
        style={textStyle(style)}
      >
        {color.name}
      </span>
    )}
    {color.value && (
      <span className="font-mono text-[10px] text-muted uppercase tracking-wider">{color.value}</span>
    )}
  </div>
);

const IMAGE_ALIGN = { left: 'mr-auto', center: 'mx-auto', right: 'ml-auto' };

/** Image with a graceful fallback: a broken or missing URL never crashes. */
const BuilderImage = ({ url, alt, style, caption }) => {
  const [failed, setFailed] = useState(false);
  const classes = cx(
    'relative overflow-hidden rounded-md border border-border bg-surface',
    ASPECT_CLASS[style?.aspect] || 'aspect-[16/10]',
    WIDTH_CLASS[style?.imageWidth],
    IMAGE_ALIGN[style?.align]
  );

  if (!url || failed) {
    return (
      <div className={classes} role="img" aria-label={alt || 'Image unavailable'}>
        <div className="h-full flex items-center justify-center px-4 text-center">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {failed ? 'Image could not be loaded' : 'No image yet'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <figure className={cx('relative w-full min-w-0', WIDTH_CLASS[style?.imageWidth], IMAGE_ALIGN[style?.align])}>
      <div className={cx('relative overflow-hidden rounded-md border border-border bg-surface', ASPECT_CLASS[style?.aspect] || 'aspect-[4/3]')}>
        <img
          src={buildCloudinaryUrl(url, { width: 2000  })}
          alt={alt || ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0  w-full h-full object-fill object-center"
        />
      </div>
      {caption && (
        <figcaption className="absolute bottom-2 left-2 text-xs text-white bg-black/50 rounded-md px-2 py-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

const IMAGE_LAYOUTS = ['image-left', 'image-right', 'image-above', 'image-below', 'full-width'];

const ImageElement = ({ block, style }) => {
  const img = block.imageBlocks || {};
  const paragraphs = (img.paragraphs || []).map((p) => String(p).trim()).filter(Boolean);
  const subheadings = (img.subheadings || []).map((s) => String(s).trim()).filter(Boolean);
  const items = (img.items || []).map((i) => String(i).trim()).filter(Boolean);

  const layout = IMAGE_LAYOUTS.includes(img.layout) ? img.layout : 'image-above';

  const text = (
    <div className={cx('min-w-0', GAP_CLASS[style?.gap] || 'space-y-3')}>
      {subheadings.map((sub, idx) => (
        <Heading key={idx} text={sub} style={{ ...style, headingLevel: style?.headingLevel || 3 }} />
      ))}
      {paragraphs.map((p, idx) => (
        <p key={idx} className={cx('text-ink', bodyClass(style))} style={textStyle(style)}>
          {p}
        </p>
      ))}
      <ItemsList items={items} style={style} />
    </div>
  );

  const image = <BuilderImage url={img.url} alt={img.heading} style={style} caption={img.caption} />;

  if (layout === 'image-left' || layout === 'image-right') {
    return (
      <div className={wrapperClass(style)} style={contentStyle(style)}>
        {img.heading && <Heading text={img.heading} style={style} />}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 items-center">
          <div className={layout === 'image-right' ? 'sm:order-2' : 'sm:order-1'}>{image}</div>
          <div className={layout === 'image-right' ? 'sm:order-1' : 'sm:order-2'}>{text}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass(style)} style={contentStyle(style)}>
      {img.heading && <Heading text={img.heading} style={style} />}
      {layout === 'image-below' ? (
        <>
          {text}
          {image}
        </>
      ) : (
        <>
          {image}
          {text}
        </>
      )}
    </div>
  );
};

const TextElement = ({ block, style }) => {
  const section = block.sections || {};
  const paragraphs = (section.paragraphs || []).map((p) => String(p).trim()).filter(Boolean);

  return (
    <div className={wrapperClass(style)} style={contentStyle(style)}>
      {section.heading && <Heading text={section.heading} style={style} />}
      {section.intro && (
        <p className={cx('text-muted', bodyClass(style))} style={textStyle(style)}>
          {section.intro}
        </p>
      )}
      {paragraphs.map((p, idx) => (
        <p key={idx} className={cx('text-ink', bodyClass(style))} style={textStyle(style)}>
          {p}
        </p>
      ))}
    </div>
  );
};

const ListElement = ({ block, style }) => {
  const list = block.lists || {};
  const items = (list.items || []).map((i) => String(i).trim()).filter(Boolean);

  return (
    <div className={wrapperClass(style)} style={contentStyle(style)}>
      {list.heading && <Heading text={list.heading} style={style} />}
      {list.paragraph && (
        <p className={cx('text-muted', bodyClass(style))} style={textStyle(style)}>
          {list.paragraph}
        </p>
      )}
      <ItemsList items={items} style={style} />
    </div>
  );
};

const KeywordsElement = ({ block, style }) => {
  const keywords = block.keywords || {};
  const items = (keywords.items || []).map((i) => String(i).trim()).filter(Boolean);

  return (
    <div className={wrapperClass(style)} style={contentStyle(style)}>
      {keywords.heading && <Heading text={keywords.heading} style={style} />}
      <ItemsList items={items} style={style} />
    </div>
  );
};

const PaletteElement = ({ block, style }) => {
  const palette = block.palette || {};
  const colors = (palette.colors || []).filter((c) => c?.value);

  return (
    <div className={wrapperClass(style)} style={contentStyle(style)}>
      <Heading text={palette.heading || 'Color Palette'} style={style} />
      {colors.length > 0 && (
        <div className="flex flex-wrap items-start gap-4 sm:gap-6">
          {colors.map((color, idx) => (
            <Swatch key={idx} color={color} style={style} />
          ))}
        </div>
      )}
    </div>
  );
};

const RENDERERS = {
  palette: PaletteElement,
  keywords: KeywordsElement,
  lists: ListElement,
  sections: TextElement,
  imageBlocks: ImageElement,
};

export const DetailBlockContent = ({ block, showEmpty = false }) => {
  if (!block || typeof block !== 'object') return null;
  const Renderer = RENDERERS[block.type];
  if (!Renderer) return null;
  if (!showEmpty && !blockHasContent(block)) return null;

  return <Renderer block={block} style={block.style || null} />;
};

/**
 * Render the whole builder array as rows.
 *
 * A single-column row keeps the article chrome (centred measure + rule) that
 * the legacy sections had; a multi-column row becomes a responsive grid that
 * collapses 3 -> 2 -> 1 as the viewport narrows.
 */
export const DetailBlockRows = ({ blocks }) => {
  const rows = groupBlocksIntoRows(Array.isArray(blocks) ? blocks : []);

  return rows.map((row) => {
    if (row.columns.length <= 1) {
      return (
        <div key={row.key} className="space-y-4 sm:space-y-6">
          {(row.columns[0] || []).map((block) => (
            <div key={block.id} className="max-w-6xl mx-auto pt-2 sm:pt-4 border-t border-border/60">
              <DetailBlockContent block={block} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        key={row.key}
        className={cx('grid gap-6 sm:gap-8 items-start', rowGridClass(row.columns.length))}
      >
        {row.columns.map((column, colIdx) => (
          <div key={colIdx} className="min-w-0 space-y-4 sm:space-y-6">
            {column.map((block) => (
              <DetailBlockContent key={block.id} block={block} />
            ))}
          </div>
        ))}
      </div>
    );
  });
};

export default DetailBlockContent;
