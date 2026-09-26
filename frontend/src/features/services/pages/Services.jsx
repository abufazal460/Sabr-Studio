import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { servicesData } from '../data/services.data';
import SectionHeading from '../../../shared/components/SectionHeading';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';

export const Services = () => {
  const { title, description, services } = servicesData;
  const reduce = useReducedMotion();

  // First-entry reveal (opacity + transform only; no layout shift). Disabled under reduced motion.
  const reveal = (amount = 0.2) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount },
          transition: { duration: 0.55, ease: 'easeOut' },
        };
  const revealItem = (i, amount = 0.15) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount },
          transition: { duration: 0.5, ease: 'easeOut', delay: 0.07 * i },
        };

  return (
    <div className="w-full bg-white">
      <Seo
        title="Studio Services"
        description="Comprehensive architectural planning, residential and commercial interior design, 3D visualization, and material consultation in New Delhi."
      />

      {/* Services Header & 3x2 Grid Section */}
      <section className="py-20 sm:py-28 lg:py-32 border-b border-border" aria-label="Services Catalog">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          {/* Centered H2 per UI-UX §39 */}
          <motion.div
            {...reveal(0.3)}
            className="text-center max-w-2xl mx-auto mb-16 sm:mb-20"
          >
            <SectionHeading
              title={title}
              description={description}
              align="center"
              as="h1"
            />
          </motion.div>

          {/* 6 Cards across 3-column desktop / 2 tablet / 1 mobile grid (UI-UX §39) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.map((svc, idx) => {
              const Icon = svc.icon;
              return (
                <motion.div key={svc.id} {...revealItem(idx)} className="h-full">
                <div
                  className="h-full bg-white border border-border p-8 sm:p-10 rounded-md transition-all duration-250 ease-out hover:scale-[1.02] hover:shadow-hover group flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    {/* Icon: 32px outline, scales to 1.1 on hover */}
                    <div className="w-14 h-14 rounded-sm bg-surface border border-border flex items-center justify-center text-ink transition-transform duration-200 group-hover:scale-110">
                      <Icon className="w-8 h-8 stroke-[1.5]" />
                    </div>

                    <div className="space-y-3">
                      {/* Title: Inter 600, uppercase per reference */}
                      <h2 className="font-inter text-lg sm:text-xl font-semibold uppercase tracking-wider text-ink">
                        {svc.title}
                      </h2>
                      {/* Description: Inter 400, color-muted, 2-line */}
                      <p className="font-inter text-sm text-muted leading-relaxed">
                        {svc.description}
                      </p>
                    </div>
                  </div>
                </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shared Inquiry Form */}
      <section className="py-20 sm:py-28 lg:py-32 bg-surface" aria-label="Service Consultation Inquiry">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <motion.div {...reveal(0.15)}>
            <EnquiryForm
              title="Book a Studio Consultation"
              subtitle="Tell us about your spatial requirements, whether private residence, commercial flagship, or custom furniture layout."
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Services;
