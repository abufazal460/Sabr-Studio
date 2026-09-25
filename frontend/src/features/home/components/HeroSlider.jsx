import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { homeHeroData } from '../data/homeHero.data';
import { Button } from '../../../shared/components/Button';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const reducedMotion = useReducedMotion();
  const { slides, eyebrow, title, description, primaryCta, secondaryCta } = homeHeroData;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  // Copy / CTA entrance: fade + small upward translate, replayed on load and each slide change.
  const copyEnter = reducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: 'easeOut' },
      };
  const ctaEnter = reducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: 'easeOut', delay: 0.12 },
      };

  return (
    <section
      className="relative w-full h-[100svh] min-h-[560px] flex items-center justify-center overflow-hidden bg-black"
      aria-label="Sabr Studio Introduction"
    >
      {/* Background Images: horizontal slide track (transform translate), both images stay mounted/preloaded */}
      <div
        className={`absolute inset-0 z-0 flex h-full w-full ${
          reducedMotion ? '' : 'transition-transform duration-700 ease-in-out'
        }`}
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={slide.id} className="relative h-full w-full shrink-0">
            <img
              src={slide.image}
              alt={slide.alt}
              loading="eager"
              fetchpriority={index === 0 ? 'high' : 'auto'}
              className="w-full h-full object-cover object-center"
            />
          </div>
        ))}
      </div>

      {/* 40% Black Overlay (UI-UX §29) — static, above images, below content */}
      <div className="absolute inset-0 bg-black/40 z-10" aria-hidden="true" />

      {/* Hero Content Shell */}
      <div className="relative z-20 max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 w-full text-center text-white py-16">
        <motion.div
          key={`copy-${currentSlide}`}
          {...copyEnter}
          className="max-w-3xl mx-auto space-y-6 sm:space-y-8"
        >
          <span className="block text-xs sm:text-sm uppercase tracking-widest font-inter font-medium text-white/80">
            {eyebrow}
          </span>

          <h1 className="font-abhaya text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.08] text-white">
            {title}
          </h1>

          <p className="font-inter text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed max-w-content mx-auto font-normal">
            {description}
          </p>

          <motion.div
            {...ctaEnter}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              to={primaryCta.to}
              variant="White"
              size="default"
              label={primaryCta.label}
              className="w-full sm:w-auto min-w-[180px]"
            />
            <Button
              to={secondaryCta.to}
              variant="WhiteOutline"
              size="default"
              label={secondaryCta.label}
              className="w-full sm:w-auto min-w-[180px]"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSlider;
