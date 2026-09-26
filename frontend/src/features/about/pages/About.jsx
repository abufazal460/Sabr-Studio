import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { aboutData } from '../data/about.data';
import Seo from '../../../shared/components/Seo';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

// Hidden or prerendered surfaces pause rAF and stop delivering intersection
// updates, so a hidden initial state applied at mount would stay forever
// (framer writes it inline and never animates it away). Decide synchronously
// before first paint: only arm entrance animations on a live, visible document.
const useCanAnimate = () => {
  const [canAnimate] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      typeof IntersectionObserver !== 'undefined' &&
      typeof requestAnimationFrame !== 'undefined'
  );
  return canAnimate;
};

export const About = () => {
  const reduce = useReducedMotion();
  const canAnimate = useCanAnimate();
  const { hero, story, founderProfile } = aboutData;
  const storyImageUrl = buildCloudinaryUrl(story.image, { width: 1000, height: 1333 });
  const founderPhotoUrl = buildCloudinaryUrl(founderProfile.portrait, { width: 800, height: 1067 });

  const openState = { x: '0%', clipPath: 'inset(0 0 0 0)' };

  const revealFrom = (dir) => {
    if (reduce || !canAnimate) return {};
    return {
      initial:
        dir === 'left'
          ? { x: '-10%', clipPath: 'inset(0 100% 0 0)' }
          : { x: '10%', clipPath: 'inset(0 0 0 100%)' },
      whileInView: openState,
      viewport: { once: true, amount: 0.2 },
      transition: { duration: 0.7, ease: 'easeOut' },
    };
  };

  const fromLeft = revealFrom('left');
  const fromRight = revealFrom('right');

  const imageHover = reduce || !canAnimate ? undefined : { scale: 1.03 };
  const imageHoverTransition = { duration: 0.35, ease: 'easeOut' };

  return (
    <div className="w-full bg-white">
      <Seo
        title="About Our Practice"
        description="Design Sense Architects is a young, idea-driven architecture and interior design office based in New Delhi, designing with soul across homes, hospitality, commercial interiors, and space styling for film and events."
      />

      {/* 1. Intro: oversized two-line serif headline + vertical divider + narrow intro column */}
      <section className="py-20 sm:py-28 lg:py-36 2xl:py-44 bg-white" aria-label="Studio Introduction">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <motion.h1
              {...fromLeft}
              className="lg:col-span-8 font-abhaya leading-[0.95] tracking-tight text-[clamp(2.75rem,9vw,10rem)]"
            >
              <span className="block font-medium text-[#33241b]">{hero.titleMain}</span>
              <span className="block italic font-normal text-brown">{hero.accentWord}</span>
            </motion.h1>

            <div className="lg:col-span-4 flex items-stretch">
              <div aria-hidden="true" className="w-px bg-border mr-6 sm:mr-8 shrink-0" />
              <motion.div {...fromRight} className="space-y-5 max-w-sm py-1">
                {hero.introParagraphs.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="font-inter text-sm sm:text-base leading-relaxed text-brown/90"
                  >
                    {paragraph}
                  </p>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About Us: tall interior image left, heading + rule + justified copy right */}
      <section className="py-20 sm:py-28 lg:py-32 2xl:py-40 bg-white" aria-label="About the Studio">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <motion.div {...fromLeft} className="lg:col-span-5">
              <div className="aspect-[3/4] w-full bg-surface overflow-hidden">
                <motion.img
                  src={storyImageUrl}
                  alt={story.imageAlt}
                  loading="lazy"
                  whileHover={imageHover}
                  transition={imageHoverTransition}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </motion.div>

            <div className="lg:col-span-7">
              <h2 className="font-inter font-bold text-xl sm:text-2xl uppercase tracking-[0.06em] text-ink">
                {story.heading}
              </h2>
              <div aria-hidden="true" className="border-t border-border mt-4 mb-6 sm:mb-8" />
              <motion.div {...fromRight} className="space-y-5 sm:space-y-6">
                {story.paragraphs.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="font-inter text-sm sm:text-base leading-relaxed text-ink/80 text-justify"
                  >
                    {typeof paragraph === 'string'
                      ? paragraph
                      : paragraph.parts.map((part, partIdx) =>
                          part.emphasis ? (
                            <strong key={partIdx} className="font-semibold italic">
                              {part.text}
                            </strong>
                          ) : (
                            <React.Fragment key={partIdx}>{part.text}</React.Fragment>
                          )
                        )}
                  </p>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Founders: centered heading + divider, portrait | name/role/bio | studio panel */}
      <section className="py-20 sm:py-28 lg:py-32 2xl:py-40 bg-white" aria-label="Studio Founders">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16">
          <h2 className="font-inter font-bold text-2xl sm:text-3xl uppercase tracking-[0.08em] text-ink text-center">
            Founders
          </h2>
          <div aria-hidden="true" className="border-t border-border mt-8 sm:mt-10 mb-12 sm:mb-16" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <motion.div {...fromLeft} className="lg:col-span-3">
              <div className="aspect-[3/4] w-full bg-surface overflow-hidden">
                <motion.img
                  src={founderPhotoUrl}
                  alt={founderProfile.portraitAlt}
                  loading="lazy"
                  whileHover={imageHover}
                  transition={imageHoverTransition}
                  className="w-full h-full object-cover object-center grayscale"
                />
              </div>
            </motion.div>

            <div className="lg:col-span-6 space-y-5">
              <span className="block font-inter text-[11px] uppercase tracking-[0.25em] text-brown font-semibold">
                {founderProfile.eyebrow}
              </span>
              <h3 className="font-abhaya text-4xl sm:text-5xl 2xl:text-6xl font-medium leading-tight text-[#33241b]">
                {founderProfile.name}
              </h3>
              <p className="font-inter text-xs uppercase tracking-[0.2em] text-brown font-medium">
                {founderProfile.role}
              </p>
              <div className="space-y-4 pt-2">
                {founderProfile.bio.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="font-inter text-sm sm:text-base leading-relaxed text-ink/80"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <motion.aside {...fromRight} className="lg:col-span-3 bg-cream p-8 sm:p-10 space-y-4">
              <span className="block font-abhaya text-5xl 2xl:text-6xl font-medium text-brown">
                {founderProfile.studioPanel.monogram}
              </span>
              <p className="font-inter text-xs leading-relaxed text-brown/90">
                {founderProfile.studioPanel.line1}
                <br />
                {founderProfile.studioPanel.line2}
              </p>
            </motion.aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
