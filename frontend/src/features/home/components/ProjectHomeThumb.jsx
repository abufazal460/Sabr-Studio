import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getProjects } from '../../projects/api/projects.api';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import SectionHeading from '../../../shared/components/SectionHeading';
import { Button } from '../../../shared/components/Button';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { fadeUpProps } from '../../../shared/animations/reveal';

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

// ---------------------------------------------------------------------------
// Project image hover overlay — black layer expands FROM CENTER outward on
// hover enter, shrinks BACK TO CENTER on hover leave.
// Uses CSS scale(0) → scale(1) with transform-origin: center to achieve the
// center-outward effect without layout changes or React state per frame.
// ---------------------------------------------------------------------------
const ProjectThumb = ({ proj, reduce }) => {
  const imageUrl = buildCloudinaryUrl(proj.coverImage, { width: 800, height: 1060 });

  return (
    <Link
      to={`/projects/${proj.slug}`}
      className="relative block aspect-[3/4] overflow-hidden bg-surface group"
    >
      {/* Project image — subtle zoom on hover (desktop enhancement only) */}
      <img
        src={imageUrl}
        alt={proj.title}
        loading="lazy"
        className={`w-full h-full object-cover object-center will-change-transform ${
          reduce
            ? ''
            : 'transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:group-hover:scale-100'
        }`}
      />

      {/* Center-expanding black overlay — scales from center on hover.
          GPU-composited via transform + opacity; essential text sits above it. */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 bg-black/60 origin-center pointer-events-none will-change-transform ${
          reduce
            ? 'opacity-0'
            : 'scale-0 opacity-0 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none group-hover:scale-100 group-hover:opacity-100'
        }`}
      />

      {/* Label scrim — always visible for touch devices and accessibility.
          Has higher z-index than the overlay so text remains readable on hover. */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 sm:p-5 text-white pointer-events-none">
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
};

export const ProjectHomeThumb = () => {
  const reduce = useReducedMotion();
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
      className="relative z-10 overflow-x-clip py-14 sm:py-20 lg:py-24 bg-white border-b border-border"
      aria-label="Selected Projects Strip"
    >
      {/* Heading — shared fade-up entry, once */}
      <motion.div
        {...fadeUpProps(reduce, 0, 20, 0.3)}
        className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 mb-8 sm:mb-12"
      >
        <SectionHeading title="Projects" align="center" />
      </motion.div>

      {/* 4-image grid: 1 across on mobile, 2 on tablet, 4 on desktop/4K max */}
      <motion.div {...fadeUpProps(reduce, 0.1, 20, 0.1)} className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {projects.map((proj) => (
            <ProjectThumb key={proj._id || proj.id || proj.slug} proj={proj} reduce={reduce} />
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <div className="text-center mt-8 sm:mt-10 px-5 sm:px-8">
        <Button
          to="/projects"
          variant="Secondary-Outline"
          size="default"
          label="View All Projects"
        />
      </div>
    </section>
  );
};

export default ProjectHomeThumb;