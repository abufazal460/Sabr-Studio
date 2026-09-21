import React from 'react';
import { processData } from '../data/process.data';
import SectionHeading from '../../../shared/components/SectionHeading';

export const ProcessStepPill = ({ step, isLeft }) => {
  return (
    <div
      className={`bg-black text-white p-6 sm:p-7 flex items-start space-x-5 transition-transform duration-200 hover:scale-[1.01] ${
        isLeft
          ? 'rounded-l-full rounded-r-none'
          : 'rounded-r-full rounded-l-none'
      } max-lg:rounded-full`}
    >
      <div className="w-10 h-10 rounded-full bg-white text-black font-inter text-sm font-semibold flex items-center justify-center shrink-0 shadow-xs">
        {step.num}
      </div>
      <div className="space-y-1.5 flex-1 pr-2">
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
  const { eyebrow, title, description, centerImage, steps } = processData;
  const leftSteps = steps.slice(0, 3);
  const rightSteps = steps.slice(3, 6);

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-surface border-b border-border" aria-label="How We Work Process">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            align="center"
          />
        </div>

        {/* Desktop 3-column layout (Steps 1-3 | Architectural Plan Image | Steps 4-6) */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-center">
          {/* Left Column (Steps 1-3) */}
          <div className="col-span-4 space-y-6">
            {leftSteps.map((step) => (
              <ProcessStepPill key={step.num} step={step} isLeft={true} />
            ))}
          </div>

          {/* Center Column (Contained architectural floor plan/axonometric drawing) */}
          <div className="col-span-4 flex items-center justify-center p-4">
            <div className="aspect-[4/5] w-full rounded-md overflow-hidden bg-white border border-border p-3 shadow-xs">
              <img
                src={centerImage}
                alt="Sabr Studio architectural spatial plan & diagram"
                loading="lazy"
                className="w-full h-full object-cover grayscale opacity-90 rounded-sm"
              />
            </div>
          </div>

          {/* Right Column (Steps 4-6) */}
          <div className="col-span-4 space-y-6">
            {rightSteps.map((step) => (
              <ProcessStepPill key={step.num} step={step} isLeft={false} />
            ))}
          </div>
        </div>

        {/* Mobile / Tablet Stack: Plan first, then steps 1-6 in order */}
        <div className="lg:hidden space-y-8">
          <div className="max-w-md mx-auto aspect-video rounded-md overflow-hidden bg-white border border-border p-2">
            <img
              src={centerImage}
              alt="Sabr Studio architectural spatial plan & diagram"
              loading="lazy"
              className="w-full h-full object-cover grayscale opacity-90 rounded-sm"
            />
          </div>

          <div className="space-y-4 max-w-xl mx-auto">
            {steps.map((step) => (
              <ProcessStepPill key={step.num} step={step} isLeft={true} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
