import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import { getProjectBySlug } from '../api/projects.api';
import { Button } from '../../../shared/components/Button';
import NotFoundState from '../../../shared/components/NotFoundState';
import ErrorState from '../../../shared/components/ErrorState';
import Skeleton from '../../../shared/components/Skeleton';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

/** Section A — Color palette swatch: name + HEX + optional description. */
const PaletteSwatch = ({ color }) => {
  const text = color.name || color.value;
  return (
    <div className="flex flex-col items-center gap-2 text-center group">
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-border shadow-xs transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: color.value }}
        aria-label={text}
        title={color.name ? `${color.name} (${color.value})` : color.value}
      />
      {color.name && (
        <span className="font-inter text-xs sm:text-sm text-ink max-w-[120px] break-words">
          {color.name}
        </span>
      )}
      {color.value && (
        <span className="font-mono text-[10px] text-muted uppercase tracking-wider">
          {color.value}
        </span>
      )}
    </div>
  );
};

const PaletteSection = ({ palette }) => {
  if (!palette || !Array.isArray(palette.colors) || !palette.colors.length) return null;
  return (
    <section
      className="max-w-4xl mx-auto space-y-4 pt-6 sm:pt-8 border-t border-border/60"
      aria-label={palette.heading || 'Color Palette'}
    >
      <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium">
        {palette.heading || 'Color Palette'}
      </h2>
      <div className="flex flex-wrap items-start gap-4 sm:gap-6 pt-2">
        {palette.colors.map((color, idx) => (
          <PaletteSwatch key={idx} color={color} />
        ))}
      </div>
    </section>
  );
};

/** Section B — Lists rendered as real <ul>/<li> (never badges). */
const ListBlock = ({ list, index }) => {
  const items = Array.isArray(list.items)
    ? list.items.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const hasContent = Boolean(list.heading || list.paragraph || items.length);
  if (!hasContent) return null;

  return (
    <section
      className="max-w-4xl mx-auto space-y-3 pt-2 sm:pt-4 border-t border-border/60"
      aria-label={`${list.heading || `List ${index + 1}`}`}
    >
      {list.heading && (
        <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium">
          {list.heading}
        </h2>
      )}
      {list.paragraph && (
        <p className="font-inter text-sm sm:text-base text-muted leading-relaxed max-w-prose">
          {list.paragraph}
        </p>
      )}
      {items.length > 0 && (
        <ul className="space-y-2 pl-5 sm:pl-7 list-disc">
          {items.map((item, idx) => (
            <li key={idx} className="font-inter text-sm sm:text-base text-ink leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** Section B2 — Keywords rendered as real <ul>/<li> (never badges). */
const KeywordsSection = ({ keywords }) => {
  const hasHeading = Boolean(keywords?.heading);
  const hasItems = Array.isArray(keywords?.items) && keywords.items.length > 0;
  if (!hasHeading && !hasItems) return null;

  return (
    <section
      className="max-w-4xl mx-auto space-y-4 pt-2 sm:pt-4 border-t border-border/60"
      aria-label={keywords?.heading || 'Keywords'}
    >
      {hasHeading && (
        <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium">
          {keywords.heading}
        </h2>
      )}
      {hasItems && (
        <ul className="space-y-2 pl-5 sm:pl-7 list-disc">
          {keywords.items.map((item, idx) => (
            <li key={idx} className="font-inter text-sm sm:text-base text-ink leading-relaxed">
              {String(item).trim()}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ListsSection = ({ lists }) => {
  if (!Array.isArray(lists) || !lists.length) return null;
  return (
    <>
      {lists.map((list, idx) => (
        <ListBlock key={idx} list={list} index={idx} />
      ))}
    </>
  );
};

const Explanation = ({ section, index }) => {
  const paragraphs = Array.isArray(section.paragraphs)
    ? section.paragraphs.map((p) => String(p).trim()).filter(Boolean)
    : [];
  if (!section.heading && !paragraphs.length) return null;

  return (
    <section
      className="max-w-4xl mx-auto space-y-3 pt-4 sm:pt-6 border-t border-border/60"
      aria-label={section.heading || `Explanation section ${index + 1}`}
    >
      {section.heading && (
        <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium">
          {section.heading}
        </h2>
      )}
      {section.intro && (
        <p className="font-inter text-sm sm:text-base text-muted leading-relaxed max-w-prose">
          {section.intro}
        </p>
      )}
      {paragraphs.map((p, idx) => (
        <p key={idx} className="font-inter text-sm sm:text-base text-ink leading-relaxed max-w-prose">
          {p}
        </p>
      ))}
    </section>
  );
};

const ExplanationsSection = ({ sections, contentBlocks }) => {
  const hasSections =
    Array.isArray(sections) &&
    sections.some(
      (s) =>
        s.heading ||
        (Array.isArray(s.paragraphs) && s.paragraphs.some(Boolean))
    );

  if (hasSections) {
    return (
      <>
        {sections.map((section, idx) => (
          <Explanation key={idx} section={section} index={idx} />
        ))}
      </>
    );
  }

  // Backward-compatible fallback for legacy flat contentBlocks (heading/paragraph).
  if (!Array.isArray(contentBlocks)) return null;
  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 sm:pt-4">
      {contentBlocks.map((block, idx) => {
        if (block.type === 'heading' && block.text) {
          return (
            <h2 key={idx} className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium">
              {block.text}
            </h2>
          );
        }
        if (block.type === 'paragraph' && block.text) {
          return (
            <p key={idx} className="font-inter text-sm sm:text-base text-ink leading-relaxed max-w-prose">
              {block.text}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
};



const ImageExplanation = ({ block, index }) => {
  const paragraphs = Array.isArray(block.paragraphs)
    ? block.paragraphs.map((p) => String(p).trim()).filter(Boolean)
    : [];
  const subheadings = Array.isArray(block.subheadings)
    ? block.subheadings.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const items = Array.isArray(block.items)
    ? block.items.map((i) => String(i).trim()).filter(Boolean)
    : [];
  const hasContent =
    Boolean(block.heading || paragraphs.length || subheadings.length || items.length || block.url);

  if (!hasContent) return null;

  const layout = block.layout === 'image-left' || block.layout === 'image-right'
    ? block.layout
    : block.url
    ? 'full-width'
    : 'editorial';
  const isLeft = layout === 'image-left';
  const isRight = layout === 'image-right';

  return (
    <section
      className="max-w-4xl mx-auto space-y-4 pt-4 sm:pt-6 border-t border-border/60"
      aria-label={block.heading || `Image explanation ${index + 1}`}
    >
      {block.heading && (
        <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium">
          {block.heading}
        </h2>
      )}

      <div
        className={`grid gap-4 sm:grid-cols-2 ${
          layout === 'full-width' || layout === 'editorial' ? 'lg:grid-cols-1' : ''
        }`}
      >
        {block.url && (
          <div
            className={`relative overflow-hidden bg-surface border border-border rounded-md aspect-[16/10] ${
              layout === 'full-width' || layout === 'editorial' ? 'sm:col-span-2' : ''
            }`}
          >
            <img
              src={buildCloudinaryUrl(block.url, { width: 1400, height: 875 })}
              alt={block.heading || `Image ${index + 1}`}
              loading="lazy"
              width="1400"
              height="875"
              className="w-full h-full object-cover object-center"
            />
            {block.caption && (
              <p className="absolute bottom-2 left-2 text-xs text-white bg-black/50 rounded-md px-2 py-1">
                {block.caption}
              </p>
            )}
          </div>
        )}
        <div
          className={`space-y-3 ${
            isLeft
              ? 'order-2 sm:order-1 sm:col-span-1'
              : isRight
              ? 'order-1 sm:order-2 sm:col-span-1'
              : 'sm:col-span-2'
          }`}
        >
          {subheadings.map((sub, idx) => (
            <h3 key={idx} className="font-abhaya text-xl sm:text-2xl text-black font-medium">
              {sub}
            </h3>
          ))}
          {paragraphs.map((p, idx) => (
            <p key={idx} className="font-inter text-sm sm:text-base text-ink leading-relaxed">
              {p}
            </p>
          ))}
          {items.length > 0 && (
            <ul className="space-y-2 pl-5 sm:pl-7 list-disc">
              {items.map((item, idx) => (
                <li key={idx} className="font-inter text-sm sm:text-base text-ink leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

const ImageBlocksSection = ({ imageBlocks }) => {
  if (!Array.isArray(imageBlocks) || !imageBlocks.length) return null;
  return (
    <>
      {imageBlocks.map((block, idx) => (
        <ImageExplanation key={idx} block={block} index={idx} />
      ))}
    </>
  );
};



export const ProjectDetail = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectBySlug(slug);
      if (res.success && res.data) {
        setProject(res.data);
      } else if (res.data) {
        setProject(res.data);
      } else {
        setProject(null);
      }
    } catch (err) {
      if (err.status === 404) {
        setProject(null);
      } else {
        setError(err.message || 'Failed to load project details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full py-16 sm:py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-8">
          <Skeleton width="160px" height="20px" />
          <Skeleton height="500px" />
          <Skeleton width="60%" height="48px" />
          <Skeleton height="24px" />
          <Skeleton height="24px" />
          <Skeleton width="80%" height="24px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <ErrorState
            title="Failed to Load Project"
            message={error}
            onRetry={fetchProject}
          />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <NotFoundState
            title="Project Not Found"
            message="The requested architectural project dossier could not be located in our archive."
            backTo="/projects"
            backLabel="Back to All Projects"
          />
        </div>
      </div>
    );
  }

  const heroSource =
    project.coverImage || project.images?.[0]?.url || project.gallery?.[0] || '';
  const heroImageUrl = heroSource
    ? buildCloudinaryUrl(heroSource, { width: 1800, height: 1012 })
    : '';
  const palette = project.palette || null;
  const keywords = project.keywords || { heading: '', items: [] };
  const lists = Array.isArray(project.lists) ? project.lists : [];
  const sections = Array.isArray(project.sections) ? project.sections : [];
  const imageBlocks = Array.isArray(project.imageBlocks) ? project.imageBlocks : [];
  const contentBlocks = Array.isArray(project.contentBlocks) ? project.contentBlocks : [];

  return (
    <div className="w-full bg-white">
      <Seo
        title={`${project.title} · Architectural Project`}
        description={
          project.shortDescription ||
          project.description ||
          `Architectural commission by Sabr Studio: ${project.title}.`
        }
        image={project.coverImage}
      />

      <article className="py-12 sm:py-20 border-b border-border">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16 space-y-10 sm:space-y-12">
          <div>
            <Link
              to="/projects"
              className="inline-flex items-center text-xs uppercase tracking-widest text-muted hover:text-ink transition-colors font-medium"
            >
              <LuArrowLeft className="mr-2 w-4 h-4" />
              All Projects
            </Link>
          </div>

          {heroImageUrl && (
            <div className="aspect-[16/9] w-full rounded-md overflow-hidden bg-surface border border-border">
              <img
                src={heroImageUrl}
                alt={project.title}
                loading="eager"
                fetchpriority="high"
                width="1800"
                height="1012"
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          <h1 className="font-abhaya text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-medium tracking-tight text-black leading-[1.1] max-w-4xl">
            {project.title}
          </h1>

          <div className="space-y-8">
            {/* Section A — Color Palette */}
            <PaletteSection palette={palette} />

            {/* Section B2 — Keywords rendered as real <ul>/<li> (never badges) */}
            <KeywordsSection keywords={keywords} />

            {/* Section B — Lists (real HTML lists) */}
            <ListsSection lists={lists} />

            {/* Section C — Headings + paragraphs (structured explanation groups) */}
            <ExplanationsSection sections={sections} contentBlocks={contentBlocks} />

            {/* Section D — Image + text explanations with selectable layouts */}
            <ImageBlocksSection imageBlocks={imageBlocks} />
          </div>

          <div className="flex justify-center pt-10 sm:pt-14">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-full">
              <Button variant="Primary" label="View All Projects" to="/projects" />
            </div>
          </div>
        </div>
      </article>

      <section className="py-20 sm:py-28 lg:py-32 bg-white" aria-label="Commission Inquiry">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <EnquiryForm
            subtitle={`Discuss commissioning an architectural or interior work inspired by ${project.title}.`}
          />
        </div>
      </section>
    </div>
  );
};

export default ProjectDetail;