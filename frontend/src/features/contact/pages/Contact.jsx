import React from 'react';
import { contactData } from '../data/contact.data';
import SectionHeading from '../../../shared/components/SectionHeading';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';

export const Contact = () => {
  const { header, infoCards, socials } = contactData;

  return (
    <div className="w-full bg-white">
      <Seo
        title="Contact & Consultations"
        description="Initiate an architectural or interior commission with Sabr Studio in New Delhi. Direct contacts, studio coordinates, and enquiry submission."
      />

      {/* Header & 3 Contact Info Cards (UI-UX §40 & §67) */}
      <section className="py-20 sm:py-28 lg:py-32 border-b border-border" aria-label="Contact Channels">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl mb-16">
            <SectionHeading
              eyebrow={header.eyebrow}
              title={header.title}
              description={header.description}
              as="h1"
            />
          </div>

          {/* 3 Contact Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {infoCards.map((card) => {
              const Icon = card.icon;
              return (
                <a
                  key={card.id}
                  href={card.href}
                  target={card.id === 'address' ? '_blank' : undefined}
                  rel={card.id === 'address' ? 'noopener noreferrer' : undefined}
                  className="p-8 sm:p-10 bg-surface border border-border rounded-md group hover:border-ink transition-all duration-200 hover:shadow-hover flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className="w-12 h-12 rounded-sm bg-white border border-border flex items-center justify-center text-ink transition-transform duration-200 group-hover:scale-105">
                      <Icon className="w-6 h-6 stroke-[1.5]" />
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs uppercase tracking-wider text-muted font-medium block">
                        {card.title}
                      </span>
                      <div className="font-abhaya text-2xl text-ink font-medium group-hover:text-black transition-colors">
                        {card.primaryText}
                      </div>
                      <p className="text-xs sm:text-sm text-muted leading-relaxed">
                        {card.secondaryText}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Social Grid (WhatsApp, Instagram, Facebook, X, YouTube with brand hover colors) */}
          <div className="mt-16 sm:mt-24 pt-12 border-t border-border">
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest text-muted font-medium block">
                Studio Channels & Portfolios
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.id}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-5 bg-white border border-border rounded-md flex flex-col justify-center space-y-3 transition-colors duration-200 group ${s.hoverColorClass}`}
                    >
                      <Icon className="w-6 h-6 text-muted group-hover:text-current transition-colors" />
                      <div>
                        <div className="font-inter text-xs uppercase tracking-wider font-semibold text-ink">
                          {s.name}
                        </div>
                        <div className="font-inter text-[11px] text-muted">
                          {s.handle}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reusable Enquiry Form */}
      <section className="py-20 sm:py-28 lg:py-32 bg-surface" aria-label="Studio Consultation Inquiry">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <EnquiryForm
            title="Start a Consultation"
            subtitle="Please share details regarding your site, spatial vision, or collectible furniture enquiry."
          />
        </div>
      </section>
    </div>
  );
};

export default Contact;
