import React from 'react';
import { expertiseData } from '../data/expertise.data';
import SectionHeading from '../../../shared/components/SectionHeading';
import { Button } from '../../../shared/components/Button';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

export const ExpertiseCard = ({ card }) => {
  const imageUrl = buildCloudinaryUrl(card.image, { width: 800, height: 1000 });

  return (
    <div className="group relative rounded-md overflow-hidden bg-black border border-border/40 aspect-[4/5] flex flex-col justify-end p-6 sm:p-8 transition-transform duration-300 hover:scale-[1.01] hover:shadow-hover">
      {/* Background Image with Hover Scale */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={imageUrl}
          alt={card.title}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-90"
        />
      </div>

      {/* Dark gradient overlay bottom half for legibility (UI-UX §34) */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
        aria-hidden="true"
      />

      {/* Card Content */}
      <div className="relative z-10 space-y-3">
        <h3 className="font-abhaya text-2xl sm:text-3xl text-white font-medium">
          {card.title}
        </h3>
        <p className="font-inter text-xs sm:text-sm text-white/80 leading-relaxed line-clamp-2">
          {card.description}
        </p>
        <div className="pt-2">
          <Button
            to={card.link}
            variant="White"
            size="sm"
            label="Read More"
          />
        </div>
      </div>
    </div>
  );
};

export const ExpertiseSection = () => {
  const { section, cards, trustStrip } = expertiseData;

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-white border-b border-border" aria-label="Our Practice Expertise">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-16">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.title}
          description={section.description}
          align="left"
        />

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {cards.map((card) => (
            <ExpertiseCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* Trust Strip (UI-UX §34: 4 items, black full-bleed bar) */}
      <div className="mt-20 sm:mt-28 bg-black text-white py-12 border-t border-border">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
            {trustStrip.map((item, idx) => (
              <div key={item.id} className={`${idx !== 0 ? 'sm:pl-8' : ''} pt-4 sm:pt-0 space-y-1`}>
                <div className="font-inter text-sm uppercase tracking-wider font-semibold text-white">
                  {item.label}
                </div>
                <div className="font-inter text-xs text-footer-muted">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertiseSection;
