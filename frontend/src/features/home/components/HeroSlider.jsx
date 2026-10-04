import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { homeHeroData } from '../data/homeHero.data';
import { Button } from '../../../shared/components/Button';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { mountFadeProps } from '../../../shared/animations/reveal';

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const { slides, eyebrow, title, description, primaryCta, secondaryCta } = homeHeroData;

  useEffect(() => {
    if (reducedMotion) {
      setCurrentSlide(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length, reducedMotion]);

  // Mount-only Hero entry: plays once on page mount, never on scroll or slide
  // change. Slide changes swap images only — copy stays stable (no replay).
  const heroEnter = mountFadeProps(reducedMotion, 0.05);
  const ctaEnter = mountFadeProps(reducedMotion, 0.2);

  // Slow scroll-linked parallax: background drifts gently as the user scrolls
  // (GPU transform via motion value — no React state per frame). The raw scroll
  // progress is run through a spring so movement lags softly behind the wheel:
  // this removes jitter/stutter and reads as slow + gradual rather than snappy,
  // while staying clearly noticeable. Disabled entirely under reduced motion.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 18,
    mass: 0.6,
  });
  const bgY = useTransform(smoothProgress, [0, 1], ['0%', '14%']);
  const contentY = useTransform(smoothProgress, [0, 1], ['0%', '-9%']);
  const contentOpacity = useTransform(smoothProgress, [0, 0.9], [1, 0.4]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] flex items-center justify-center overflow-hidden overflow-x-clip bg-black"
      aria-label="Sabr Studio Introduction"
    >
      {/* Background Images: horizontal slide track (transform translate), both images stay mounted/preloaded */}
      <motion.div
        aria-hidden="true"
        style={reducedMotion ? undefined : { y: bgY }}
        className="absolute inset-0 z-0 will-change-transform"
      >
        <div
          className={`flex h-full w-full will-change-transform ${
            reducedMotion ? '' : 'transition-transform duration-700 ease-in-out'
          }`}
          style={{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)` }}
        >
          {slides.map((slide, index) => (
            <div key={slide.id} className="relative h-full w-full shrink-0">
              <img
                src={slide.image}
                alt=""
                loading="eager"
                fetchpriority={index === 0 ? 'high' : 'auto'}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* 40% Black Overlay (UI-UX §29) — static, above images, below content */}
      <div className="absolute inset-0 bg-black/40 z-10" aria-hidden="true" />

      {/* Hero Content Shell */}
      <motion.div
        style={reducedMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-20 max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 w-full max-w-full text-center text-white py-12 sm:py-16"
      >
        <motion.div
          {...heroEnter}
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
      </motion.div>
    </section>
  );
};

export default HeroSlider;
