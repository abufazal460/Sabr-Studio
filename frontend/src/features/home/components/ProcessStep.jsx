import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from 'framer-motion';
import { processData } from '../data/process.data';
import SectionHeading from '../../../shared/components/SectionHeading';
import { fadeUpProps } from '../../../shared/animations/reveal';

export const ProcessStepPill = ({ step, isLeft }) => {
  return (
    <div
      className={`bg-black text-white p-6 sm:p-7 flex items-start space-x-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.01] motion-reduce:transition-none ${
        isLeft
          ? 'rounded-l-full rounded-r-none'
          : 'rounded-r-full rounded-l-none'
      } max-lg:rounded-full min-w-0 flex justify-center items-center`}
    >
      <div className="w-10 h-10  rounded-full bg-white text-black font-inter text-sm font-semibold flex items-center justify-center shrink-0 shadow-xs">
        {step.num}
      </div>
      <div className="space-y-1.5 flex-1 pr-2 min-w-0">
        <h4 className="font-inter text-base font-semibold text-white">
          {step.title}
        </h4>
        <p className="font-inter text-xs sm:text-sm text-footer-muted leading-relaxed line-clamp-2">
          {step.description}
        </p>
      </div>
    </div>
  );
};

export const ProcessSection = () => {
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const { eyebrow, title, description, centerImage, steps } = processData;
  const leftSteps = steps.slice(0, 3);
  const rightSteps = steps.slice(3, 6);

  // Gentle scroll-linked drift for the center plan image only (GPU transform
  // via motion value — no React state per frame). Pills use entry animation
  // only, so they never replay or scrub while scrolling. Reduced-motion safe.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  // Spring-smoothed so the plan drifts slowly and gradually with no jitter.
  // framer resolves % of element size, so the range scales across breakpoints
  // (no hardcoded pixel value that only looks right on desktop).
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 16,
    mass: 0.7,
  });
  const planY = useTransform(smoothProgress, [0, 1], ['6%', '-6%']);

  return (
    <section
      ref={sectionRef}
      className="relative z-20 overflow-hidden overflow-x-clip py-14 sm:py-20 lg:py-24 bg-white"
      aria-label="How We Work Process"
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        <motion.div {...fadeUpProps(reduce, 0, 20, 0.3)} className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            align="center"
          />
        </motion.div>

        {/* Desktop 3-column layout (Steps 1-3 | Architectural Plan Image | Steps 4-6) */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-center">
          {/* Left Column (Steps 1-3) */}
          <div className="col-span-4 space-y-6">
            {leftSteps.map((step, idx) => (
              <motion.div key={step.num} {...fadeUpProps(reduce, 0.08 * idx, 20, 0.15)}>
                <ProcessStepPill step={step} isLeft={true} />
              </motion.div>
            ))}
          </div>

          {/* Center Column (Contained architectural floor plan/axonometric drawing) */}
          <motion.div
            style={reduce ? undefined : { y: planY }}
            className="col-span-4 flex items-center justify-center p-4 will-change-transform"
          >
            <div className="aspect-[4/5] w-full max-h-[70vh] rounded-md overflow-hidden bg-white border border-border p-3 shadow-xs">
              <img
                src={centerImage}
                alt="Sabr Studio architectural spatial plan & diagram"
                loading="lazy"
                className="w-full h-full object-cover grayscale opacity-90 rounded-sm"
              />
            </div>
          </motion.div>

          {/* Right Column (Steps 4-6) */}
          <div className="col-span-4 space-y-6">
            {rightSteps.map((step, idx) => (
              <motion.div key={step.num} {...fadeUpProps(reduce, 0.08 * idx, 20, 0.15)}>
                <ProcessStepPill step={step} isLeft={false} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile / Tablet Stack: Plan first, then steps 1-6 in order */}
        <div className="lg:hidden space-y-6 sm:space-y-8">
          <motion.div
            {...fadeUpProps(reduce, 0, 20, 0.2)}
            className="max-w-md mx-auto aspect-video w-full rounded-md overflow-hidden bg-white border border-border p-2"
          >
            <img
              src={centerImage}
              alt="Sabr Studio architectural spatial plan & diagram"
              loading="lazy"
              className="w-full h-full object-cover grayscale opacity-90 rounded-sm"
            />
          </motion.div>

          <div className="space-y-4 max-w-xl mx-auto w-full">
            {steps.map((step, idx) => (
              <motion.div key={step.num} {...fadeUpProps(reduce, Math.min(0.08 * idx, 0.24), 20, 0.1)}>
                <ProcessStepPill step={step} isLeft={true} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
