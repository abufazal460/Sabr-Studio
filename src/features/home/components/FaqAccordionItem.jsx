import React, { useState } from 'react';
import { faqData } from '../data/faq.data';
import { LuPlus } from 'react-icons/lu';

export const FaqAccordionItem = ({ item, isOpen, onToggle }) => {
  return (
    <div className="border-b border-border py-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${item.id}`}
        className="w-full flex items-center justify-between text-left group focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
      >
        <span className="font-inter text-base sm:text-lg text-ink font-normal pr-4 group-hover:text-black transition-colors">
          {item.question}
        </span>

        {/* Rotates 45deg on open (UI-UX §38) */}
        <span
          className={`shrink-0 p-1 text-muted group-hover:text-ink transition-transform duration-250 ease-out ${
            isOpen ? 'rotate-45 text-ink' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          <LuPlus className="w-5 h-5 stroke-[1.5]" />
        </span>
      </button>

      {/* Animated grid-template-rows expansion to guarantee zero layout shift (UI-UX §38) */}
      <div
        id={`faq-answer-${item.id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr] mt-3 opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="font-inter text-sm text-muted leading-relaxed pr-8 pb-2">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
};

export const FaqSection = () => {
  const [openId, setOpenId] = useState(null);

  const handleToggle = (id) => {
    // Single-open accordion behavior per UI-UX §38
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-white border-b border-border" aria-label="Frequently Asked Questions">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        {/* Eyebrow across both columns (UI-UX §38) */}
        <span className="text-xs uppercase tracking-widest text-muted font-medium block mb-4">
          Frequently Asked Questions
        </span>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column Heading */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-abhaya text-3xl sm:text-5xl text-ink font-medium leading-[1.15]">
              Do you need some help?
            </h2>
            <p className="font-inter text-sm sm:text-base text-muted leading-relaxed max-w-md">
              We operate with clarity and candor. Find answers regarding our architectural methodology, project pacing, and bespoke material commissions.
            </p>
          </div>

          {/* Right Column Accordion */}
          <div className="lg:col-span-7 divide-y-0">
            {faqData.map((item) => (
              <FaqAccordionItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
