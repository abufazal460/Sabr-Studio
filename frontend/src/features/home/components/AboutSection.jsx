import React from 'react';
import { motion } from 'framer-motion';
import { aboutData } from '../../about/data/about.data';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import Badge from '../../../shared/components/Badge';
import { useClipReveal } from '../../../shared/animations/reveal';

export const AboutSection = () => {
  const { founder } = aboutData;
  const founderPhotoUrl = buildCloudinaryUrl(founder.photo, { width: 800, height: 1000 });

  // Portrait: clip-slide from left. Text: clip-slide from right.
  // Matches About page Hero section exactly (shared reveal system).
  const portraitReveal = useClipReveal('left', 0.15);
  const textReveal = useClipReveal('right', 0.15);

  return (
    <section
      className="overflow-hidden overflow-x-clip py-14 sm:py-20 lg:py-24 bg-white"
      aria-label="About the Studio"
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        {/* Founder image + text */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-16 items-center">
          <motion.div
            ref={portraitReveal.ref}
            animate={portraitReveal.controls}
            className="lg:col-span-5"
          >
            <div className="aspect-[4/5] max-h-[70svh] lg:max-h-none w-full bg-surface border border-border rounded-md overflow-hidden cursor-pointer">
              <img
                src={founderPhotoUrl}
                alt={founder.name}
                loading="lazy"
                className="w-full h-full object-cover object-center transition-transform duration-300 ease-out motion-safe:hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 will-change-transform"
              />
            </div>
          </motion.div>

          <motion.div
            ref={textReveal.ref}
            animate={textReveal.controls}
            className="lg:col-span-7 space-y-5 sm:space-y-6 min-w-0"
          >
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
