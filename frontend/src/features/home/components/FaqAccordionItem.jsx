import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { faqData } from '../data/faq.data';
import { LuPlus, LuMinus } from 'react-icons/lu';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { fadeUpProps } from '../../../shared/animations/reveal';

export const FaqAccordionItem = ({ item, isOpen, onToggle }) => {
  return (
    <div
      className={`border-b border-border py-5 px-5 ${
        isOpen ? 'bg-surface [box-shadow:inset_3px_0_0_0_#111111]' : ''
      }`}
    >
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

        {/* Plus <-> Minus swap reflecting open state (UI-UX §38) */}
        <span
          className={`shrink-0 p-1 text-muted group-hover:text-ink transition-transform duration-300 ease-out motion-reduce:transition-none ${
            isOpen ? 'rotate-180 text-ink' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          {isOpen ? (
            <LuMinus className="w-5 h-5 stroke-[1.5]" />
          ) : (
            <LuPlus className="w-5 h-5 stroke-[1.5]" />
          )}
        </span>
      </button>

      {/* Grid-template-rows expansion (measured-height, no manual reflow) + opacity fade */}
      <div
        id={`faq-answer-${item.id}`}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
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
  const reduce = useReducedMotion();

  const handleToggle = (id) => {
    // Single-open accordion behavior per UI-UX §38
    setOpenId((prev) => (prev === id ? null : id));
  };

  // Entry animations: single shared fade-up language, each fires once.
  // Accordion open/close behavior is untouched (CSS grid-rows transition).
  const eyebrowEnter = fadeUpProps(reduce, 0, 20, 0.3);
  const headingEnter = fadeUpProps(reduce, 0.08, 20, 0.3);
  const listEnter = fadeUpProps(reduce, 0.16, 20, 0.1);

  return (
    <section className="py-14 sm:py-20 lg:py-24 bg-white border-b border-border overflow-x-clip" aria-label="Frequently Asked Questions">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        {/* Eyebrow across both columns (UI-UX §38) */}
        <motion.span
          {...eyebrowEnter}
          className="text-xs uppercase tracking-widest text-muted font-medium block mb-4"
        >
          Frequently Asked Questions
        </motion.span>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-16 justify-center items-center">
          {/* Left Column Heading */}
          <motion.div {...headingEnter} className="lg:col-span-5 space-y-4 min-w-0">
            <h2
              className="font-abhaya text-3xl sm:text-5xl text-ink font-medium leading-[1.15]"
            >
              Do you need some help?
            </h2>
           
          </motion.div>

          {/* Right Column Accordion */}
          <motion.div {...listEnter} className="lg:col-span-7 divide-y-0 min-w-0">
            {faqData.map((item) => (
              <FaqAccordionItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
