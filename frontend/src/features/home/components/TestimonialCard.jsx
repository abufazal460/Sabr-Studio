import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { testimonialsData } from '../data/testimonials.data';
import SectionHeading from '../../../shared/components/SectionHeading';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { fadeUpProps } from '../../../shared/animations/reveal';

export const TestimonialCard = ({ item }) => {
  const avatarUrl = buildCloudinaryUrl(item.avatar, { width: 100, height: 100 });

  return (
    <div className="bg-black text-white p-8 sm:p-10 rounded-md flex flex-col justify-between h-full space-y-8 select-none">
      {/* Large Quote Mark Glyph (Abhaya Libre) */}
      <div className="font-abhaya text-6xl text-white/40 leading-none h-8 select-none">
        “
      </div>

      {/* Testimonial message (Inter 400, white, 1.5 line-height) */}
      <p className="font-inter text-sm sm:text-base text-white/90 leading-relaxed flex-1">
        {item.quote}
      </p>

      {/* Author Info (Avatar + Name only - NO rating stars, NO role, NO location per UI-UX §37) */}
      <div className="flex items-center space-x-4 pt-4 border-t border-white/10">
        <img
          src={avatarUrl}
          alt={item.author}
          loading="lazy"
          className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
        />
        <span className="font-inter text-sm font-semibold text-white">
          {item.author}
        </span>
      </div>
    </div>
  );
};

export const TestimonialsSection = () => {
  const reduce = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Auto-advance every 5 seconds (UI-UX §37)
  useEffect(() => {
    if (isPaused || reduce) return undefined;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonialsData.length);
    }, 5000);

    return () => clearInterval(timerRef.current);
  }, [isPaused, reduce]);

  // Clamp index to valid start positions per visible count so the track never
  // overshoots into blank space (desktop shows 3, tablet 2, mobile 1).
  // Max start = length - visible; dots map 1:1 to these positions.
  const maxStart = Math.max(0, testimonialsData.length - 1);
  const safeIndex = Math.min(currentIndex, maxStart);

  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-white border-b border-border overflow-hidden overflow-x-clip"
      aria-label="Client Testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        <motion.div {...fadeUpProps(reduce, 0, 20, 0.3)} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <SectionHeading
            eyebrow="Client Testimonials"
            title="What Our Customers Say About Us"
            align="center"
          />
        </motion.div>

        {/* Carousel Viewport: Desktop 3, Tablet 2, Mobile 1 */}
        <motion.div {...fadeUpProps(reduce, 0.1, 20, 0.1)} className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out motion-reduce:transition-none will-change-transform [--step:100%] sm:[--step:50%] lg:[--step:33.3333%]"
            style={{
              transform: `translate3d(calc(${-safeIndex} * var(--step)), 0, 0)`,
            }}
          >
            {testimonialsData.map((item, idx) => (
              <div
                key={item.id || idx}
                className="w-full sm:w-1/2 lg:w-1/3 shrink-0 px-2 sm:px-3 min-w-0"
              >
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dot Navigation Indicators only (UI-UX §37: arrows removed) */}
        <div
          className="flex items-center justify-center space-x-3 mt-8 sm:mt-10"
          role="tablist"
          aria-label="Testimonial slides"
        >
          {testimonialsData.map((_, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => {
                  setCurrentIndex(Math.min(idx, maxStart));
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 8000);
                }}
                className={`w-2.5 h-2.5 rounded-full min-w-[10px] min-h-[10px] ${
                  isActive
                    ? 'bg-black'
                    : 'bg-border hover:bg-muted'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
