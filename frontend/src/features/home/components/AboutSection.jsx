import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import { aboutData } from '../../about/data/about.data';
import { statsData } from '../data/stats.data';
import { getProjects } from '../../projects/api/projects.api';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import Badge from '../../../shared/components/Badge';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';

const fallbackProjects = [
  {
    id: '1',
    title: 'The Courtyard Pavilion',
    category: 'Residential',
    slug: 'courtyard-pavilion',
    coverImage:
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Ash & Travertine Penthouse',
    category: 'Interior Architecture',
    slug: 'ash-travertine-penthouse',
    coverImage:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Sanctuary Tea House',
    category: 'Hospitality',
    slug: 'sanctuary-tea-house',
    coverImage:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Lado Sarai Workshop',
    category: 'Commercial & Studio',
    slug: 'lado-sarai-workshop',
    coverImage:
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
  },
];

const Counter = ({ value, label, start, reduce }) => {
  const num = parseInt(value, 10) || 0;
  const suffix = value.replace(/[0-9]/g, '');
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    if (reduce) {
      mv.set(num);
      return;
    }
    if (!start) return;
    const controls = animate(mv, num, { duration: 1.2, ease: 'easeOut' });
    return () => controls.stop();
  }, [start, reduce, num, mv]);

  return (
    <div className="px-8 py-10 sm:py-14 text-center flex flex-col justify-center space-y-2 bg-white">
      <div className="font-inter text-4xl sm:text-5xl font-semibold text-ink tracking-tight">
        <motion.span>{rounded}</motion.span>
        {suffix}
      </div>
      <div className="font-inter text-xs sm:text-sm text-muted uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
};

export const AboutSection = () => {
  const reduce = useReducedMotion();
  const { founder } = aboutData;
  const founderPhotoUrl = buildCloudinaryUrl(founder.photo, { width: 800, height: 1000 });

  const [projects, setProjects] = useState(fallbackProjects);
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 });

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

  const textEnter = reduce
    ? {
        initial: false,
        whileInView: { opacity: 1, x: '0%' },
        viewport: { once: true, amount: 0.3 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, x: '15%' },
        whileInView: { opacity: 1, x: '0%' },
        viewport: { once: true, amount: 0.3 },
        transition: { duration: 0.6, ease: 'easeOut' },
      };

  return (
    <section
      className="overflow-hidden py-20 sm:py-28 lg:py-32 bg-white"
      aria-label="About the Studio"
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-16 lg:space-y-24">
        {/* Founder image + text */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-5">
            <div className="aspect-[4/5] bg-surface border border-border rounded-md overflow-hidden cursor-pointer">
              <img
                src={founderPhotoUrl}
                alt={founder.name}
                loading="lazy"
                className="w-full h-full object-cover object-center transition-transform duration-300 ease-out motion-safe:hover:scale-105"
              />
            </div>
          </div>

          <motion.div {...textEnter} className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <Badge variant="brown" className="mb-2">
                {founder.badge}
              </Badge>
              <h2 className="font-abhaya text-3xl sm:text-5xl text-ink font-medium">
                {founder.name}
              </h2>
              <p className="font-inter text-xs sm:text-sm uppercase tracking-widest text-muted font-medium">
                {founder.role}
              </p>
            </div>
            <p className="font-inter text-sm sm:text-base text-muted leading-relaxed max-w-xl">
              {founder.bio}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
