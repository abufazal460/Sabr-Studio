import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { aboutData } from '../data/about.data';
import Seo from '../../../shared/components/Seo';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

export const About = () => {
  const reduce = useReducedMotion();
  const { hero, story, founder } = aboutData;
  const storyImageUrl = buildCloudinaryUrl(story.image, { width: 1000, height: 1333 });
  const founderPhotoUrl = buildCloudinaryUrl(founder.photo, { width: 800, height: 1067 });

  const fromLeft = reduce
    ? {
        initial: false,
        whileInView: { x: '0%', clipPath: 'inset(0 0 0 0)' },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0 },
      }
    : {
        initial: { x: '-10%', clipPath: 'inset(0 100% 0 0)' },
        whileInView: { x: '0%', clipPath: 'inset(0 0 0 0)' },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.7, ease: 'easeOut' },
      };

  const fromRight = reduce
    ? {
        initial: false,
        whileInView: { x: '0%', clipPath: 'inset(0 0 0 0)' },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0 },
      }
    : {
        initial: { x: '10%', clipPath: 'inset(0 0 0 100%)' },
        whileInView: { x: '0%', clipPath: 'inset(0 0 0 0)' },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.7, ease: 'easeOut' },
      };

  const imageHover = reduce ? undefined : { scale: 1.03 };
  const imageHoverTransition = { duration: 0.35, ease: 'easeOut' };

  return (
    <div className="w-full bg-white">
      <Seo
        title="About Our Practice"
        description="Founded in New Delhi in 2012, Sabr Studio operates at the intersection of monolithic architectural clarity, wabi-sabi stillness, and bespoke artisan joinery."
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
                    {paragraph}
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
                  alt={founder.name}
                  loading="lazy"
                  whileHover={imageHover}
                  transition={imageHoverTransition}
                  className="w-full h-full object-cover object-center grayscale"
                />
              </div>
            </motion.div>

            <div className="lg:col-span-6 space-y-5">
              <span className="block font-inter text-[11px] uppercase tracking-[0.25em] text-brown font-semibold">
                Founder
              </span>
              <h3 className="font-abhaya text-4xl sm:text-5xl 2xl:text-6xl font-medium leading-tight text-[#33241b]">
                {founder.name}
              </h3>
              <p className="font-inter text-xs uppercase tracking-[0.2em] text-brown font-medium">
                {founder.role}
              </p>
              <div className="space-y-4 pt-2">
                {founder.aboutBio.map((paragraph, idx) => (
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
                {founder.studioPanel.monogram}
              </span>
              <p className="font-inter text-xs leading-relaxed text-brown/90">
                {founder.studioPanel.line1}
                <br />
                {founder.studioPanel.line2}
              </p>
            </motion.aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
