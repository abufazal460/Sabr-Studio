import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../../projects/api/projects.api';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import SectionHeading from '../../../shared/components/SectionHeading';

// Default curated fallback projects when backend is not yet populated
const fallbackProjects = [
  {
    id: '1',
    title: 'The Courtyard Pavilion',
    category: 'Residential',
    slug: 'courtyard-pavilion',
    coverImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Ash & Travertine Penthouse',
    category: 'Interior Architecture',
    slug: 'ash-travertine-penthouse',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Sanctuary Tea House',
    category: 'Hospitality',
    slug: 'sanctuary-tea-house',
    coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Lado Sarai Workshop',
    category: 'Commercial & Studio',
    slug: 'lado-sarai-workshop',
    coverImage: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
  },
];

export const ProjectHomeThumb = () => {
  const [projects, setProjects] = useState(fallbackProjects);

  useEffect(() => {
    getProjects({ limit: 4 })
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setProjects(res.data.slice(0, 4));
        }
      })
      .catch(() => {
        // Silent fallback to curated architectural projects
      });
  }, []);

  return (
    <section
      className="relative z-10 overflow-x-clip py-20 sm:py-28 lg:py-32 bg-white border-b border-border"
      aria-label="Selected Projects Strip"
    >
      {/* Keep this section above the preceding desktop layer so the
          heading, grid, and CTA stay visible and usable at every width. */}
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 mb-12 sm:mb-16">
        <SectionHeading title="Projects" align="center" />
      </div>

      {/* 4-image grid: 2 across on mobile/tablet, 4 across on desktop (UI-UX §35).
          All available items (up to four) render immediately; further projects are
          reached through the "View All Projects" link below. */}
      <div className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {projects.map((proj) => {
            const imageUrl = buildCloudinaryUrl(proj.coverImage, { width: 800, height: 1060 });
            return (
              <Link
                key={proj.id}
                to={`/projects/${proj.slug}`}
                className="relative block aspect-[3/4] overflow-hidden bg-surface"
              >
                <img
                  src={imageUrl}
                  alt={proj.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center"
                />

                {/* Static label scrim — always visible so
                    project titles stay readable on touch devices and at 320px. */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 sm:p-5 text-white">
                  <span className="font-inter text-[10px] sm:text-xs uppercase tracking-widest font-medium text-white/80 mb-1 leading-tight">
                    {proj.category}
                  </span>
                  <h3 className="font-abhaya text-base sm:text-2xl font-medium leading-tight break-words">
                    {proj.title}
                  </h3>
                  <span className="mt-2 sm:mt-4 inline-flex self-start font-inter text-[10px] sm:text-xs uppercase tracking-widest font-semibold px-3 sm:px-4 py-1.5 sm:py-2 border border-white rounded-sm">
                    View Project
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Static CTA — same resting Secondary-Outline look (border, type, 44px
          target), usable with keyboard, touch, and mouse at every width. */}
      <div className="text-center mt-12 px-5 sm:px-8">
        <Link
          to="/projects"
          className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-ink bg-transparent px-6 py-3 font-inter text-sm font-medium tracking-wide text-ink select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          View All Projects
        </Link>
      </div>
    </section>
  );
};

export default ProjectHomeThumb;