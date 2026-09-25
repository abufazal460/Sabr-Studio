import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getProjects } from '../../projects/api/projects.api';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import SectionHeading from '../../../shared/components/SectionHeading';
import { Button } from '../../../shared/components/Button';

gsap.registerPlugin(ScrollTrigger);

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
  const sectionRef = useRef(null);
  const processRef = useRef(null);

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

  // Keep this section and the process section that overlays it the same height/width
  // at every breakpoint so the pin-and-cover handoff stays aligned.
  useEffect(() => {
    // Capture the following process section before GSAP pinning reparents this section.
    if (!processRef.current) {
      processRef.current = sectionRef.current?.nextElementSibling || null;
    }
    const equalize = () => {
      const proj = sectionRef.current;
      const proc = processRef.current;
      if (!proj || !proc) return;
      proj.style.height = '';
      proc.style.height = '';
      const height = Math.max(proj.scrollHeight, proc.scrollHeight);
      proj.style.height = `${height}px`;
      proc.style.height = `${height}px`;
      ScrollTrigger.refresh();
    };

    equalize();
    window.addEventListener('resize', equalize);
    window.addEventListener('load', equalize);
    return () => {
      window.removeEventListener('resize', equalize);
      window.removeEventListener('load', equalize);
    };
  }, []);

  // Pin this section; the following process section scrolls up and covers it.
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: () => '+=' + (sectionRef.current?.offsetHeight || window.innerHeight),
        pin: true,
        pinSpacing: false,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 py-20 sm:py-28 lg:py-32 bg-white border-b border-border"
      aria-label="Selected Projects Strip"
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 mb-12 sm:mb-16">
        <SectionHeading
          eyebrow="Architectural Portfolio"
          title="Selected Projects"
          description="A chronological cross-section of monolithic residences and quiet interior spaces."
          align="center"
        />
      </div>

      {/* Edge-to-edge 4-image row (UI-UX §35: 4 -> 2 -> 1, touching on desktop) */}
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {projects.map((proj) => {
            const imageUrl = buildCloudinaryUrl(proj.coverImage, { width: 800, height: 1060 });
            return (
              <Link
                key={proj.id}
                to={`/projects/${proj.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden bg-surface"
              >
                <img
                  src={imageUrl}
                  alt={proj.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center"
                />

                {/* Hover overlay with centered white label (UI-UX §35) */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out motion-reduce:transition-none flex flex-col items-center justify-center p-6 text-center text-white">
                  <span className="font-inter text-xs uppercase tracking-widest font-medium text-white/80 mb-2">
                    {proj.category}
                  </span>
                  <h3 className="font-abhaya text-2xl font-medium mb-4">
                    {proj.title}
                  </h3>
                  <span className="font-inter text-xs uppercase tracking-widest font-semibold px-4 py-2 border border-white text-white rounded-sm">
                    View Project
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="text-center mt-12">
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
