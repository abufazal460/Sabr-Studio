import React, { useState, useEffect, useRef } from 'react';
import { testimonialsData } from '../data/testimonials.data';
import SectionHeading from '../../../shared/components/SectionHeading';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Auto-advance every 5 seconds (UI-UX §37)
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonialsData.length);
    }, 5000);

    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  return (
    <section
      className="py-20 sm:py-28 lg:py-32 bg-white border-b border-border overflow-hidden"
      aria-label="Client Testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <SectionHeading
            eyebrow="Client Testimonials"
            title="What Our Customers Say About Us"
            align="center"
          />
        </div>

        {/* Carousel Viewport: Desktop 3, Tablet 2, Mobile 1 */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {testimonialsData.map((item, idx) => (
              <div
                key={item.id || idx}
                className="w-full sm:w-1/2 lg:w-1/3 shrink-0 px-3"
              >
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {/* Dot Navigation Indicators only (UI-UX §37: arrows removed) */}
        <div
          className="flex items-center justify-center space-x-3 mt-10"
          role="tablist"
          aria-label="Testimonial slides"
        >
          {testimonialsData.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 8000);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-[transform,background-color] duration-300 ease-out motion-reduce:transition-none ${
                  isActive
                    ? 'bg-black scale-x-[2.6]'
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
