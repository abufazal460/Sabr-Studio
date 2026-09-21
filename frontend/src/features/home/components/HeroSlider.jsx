import React, { useState, useEffect } from 'react';
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

  return (
    <section
      className="relative w-full h-[100svh] min-h-[560px] flex items-center justify-center overflow-hidden bg-black"
      aria-label="Sabr Studio Introduction"
    >
      {/* Background Images with Cross-Fade */}
      {slides.map((slide, index) => {
        const isCurrent = index === currentSlide;
        const transitionStyle = reducedMotion
          ? 'transition-none'
          : 'transition-opacity duration-1200 ease-in-out';

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 w-full h-full ${transitionStyle} ${
              isCurrent ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none'
            }`}
            aria-hidden={!isCurrent}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              loading="eager"
              fetchpriority={index === 0 ? 'high' : 'auto'}
              className="w-full h-full object-cover object-center"
            />
          </div>
        );
      })}

      {/* 40% Black Overlay (UI-UX §29) */}
      <div className="absolute inset-0 bg-black/40 z-10" aria-hidden="true" />

      {/* Hero Content Shell */}
      <div className="relative z-20 max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 w-full text-center text-white py-16">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
          <span className="block text-xs sm:text-sm uppercase tracking-widest font-inter font-medium text-white/80">
            {eyebrow}
          </span>

          <h1 className="font-abhaya text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.08] text-white">
            {title}
          </h1>

          <p className="font-inter text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed max-w-content mx-auto font-normal">
            {description}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
