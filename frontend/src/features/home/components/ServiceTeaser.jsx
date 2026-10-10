import React from 'react';
import { motion } from 'framer-motion';
import { LuBuilding2, LuArmchair, LuTrees } from 'react-icons/lu';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { fadeUpProps } from '../../../shared/animations/reveal';

// Home Services trio per the Figma `home/service` design (title, copy, icon).
const homeServices = [
  {
    id: 'commercial-design',
    icon: LuBuilding2,
    title: 'Commercial Design',
    description:
      'Thoughtful and functional commercial spaces for offices, retail, hospitality and other business environments.',
  },
  {
    id: 'interior-design',
    icon: LuArmchair,
    title: 'Interior Design',
    description:
      'From concept to completion, we oversee every detail to bring your vision to life efficiently.',
  },
  {
    id: 'outdoor-design',
    icon: LuTrees,
    title: 'Outdoor Design',
    description:
      'Celebrate the changing seasons with our seasonal outdoor decor services',
  },
];

export const ServiceTeaser = () => {
  const reduce = useReducedMotion();

  return (
    <section
      className="relative z-0 overflow-x-clip bg-white"
      aria-label="Studio Services Overview"
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-20 lg:py-24">
        {/* Left rule + heading (Figma home/service) */}
        <motion.div {...fadeUpProps(reduce, 0, 20, 0.4)} className="flex items-center gap-6 sm:gap-10 mb-10 sm:mb-14 lg:mb-16">
          <span aria-hidden="true" className="h-[3px] w-16 sm:w-24 bg-ink shrink-0" />
          <h2
            className="font-inter font-bold text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight"
          >
            Our Services
          </h2>
        </motion.div>

        {/* Three service columns: icon left, title + description right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-16">
          {homeServices.map((svc, idx) => {
            const Icon = svc.icon;
            return (
              <motion.div key={svc.id} {...fadeUpProps(reduce, 0.08 * idx, 20, 0.15)} className="flex items-start gap-5 sm:gap-6 min-w-0">
                <Icon
                  className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 text-ink stroke-[1.5]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <h3 className="font-inter font-bold text-xl sm:text-2xl text-ink">
                    {svc.title}
                  </h3>
                  <p className="mt-3 sm:mt-4 font-inter text-sm sm:text-base text-muted leading-relaxed">
                    {svc.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceTeaser;
