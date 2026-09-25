import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { faqData } from '../data/faq.data';
import { LuPlus, LuMinus } from 'react-icons/lu';

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

  // Top heading: one-time entrance from above (fade + downward translate)
  const topHeading = reduce
    ? { initial: false, whileInView: { opacity: 1, y: '0px' }, viewport: { once: true }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: '-28px' },
        whileInView: { opacity: 1, y: '0px' },
        viewport: { once: true, amount: 0.6 },
        transition: { duration: 0.6, ease: 'easeOut' },
      };

  // Side heading: continuous scroll in/out from the left (re-triggers every time)
  const sideHeading = reduce
    ? { initial: false, whileInView: { opacity: 1, x: '0px' }, viewport: { once: false }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, x: '-48px' },
        whileInView: { opacity: 1, x: '0px' },
        viewport: { once: false, amount: 0.4 },
        transition: { duration: 0.5, ease: 'easeOut' },
      };

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-white border-b border-border" aria-label="Frequently Asked Questions">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        {/* Eyebrow across both columns (UI-UX §38) */}
        <motion.span
          {...topHeading}
          className="text-xs uppercase tracking-widest text-muted font-medium block mb-4"
        >
          Frequently Asked Questions
        </motion.span>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 justify-center items-center">
          {/* Left Column Heading */}
          <div className="lg:col-span-5 space-y-4">
            <motion.h2
              {...sideHeading}
              className="font-abhaya text-3xl sm:text-5xl text-ink font-medium leading-[1.15]"
            >
              Do you need some help?
            </motion.h2>
           
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
