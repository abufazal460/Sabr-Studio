import React from 'react';
import { Link } from 'react-router-dom';
import { LuArrowRight } from 'react-icons/lu';
import { servicesData } from '../../services/data/services.data';

export const ServiceTeaser = () => {
  // Pull 3 featured services for the home teaser per UI-UX §34
  const featuredServices = servicesData.services.filter((s) => s.featured).slice(0, 3);

  return (
    <section className="py-20 sm:py-28 lg:py-32 bg-surface border-b border-border" aria-label="Studio Services Overview">
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
        {/* Top Rule + Left-aligned Header */}
        <div className="border-t border-border pt-8 mb-16 flex flex-col sm:flex-row justify-between sm:items-end gap-6">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-muted font-medium block">
              Studio Disciplines
            </span>
            <h2 className="font-abhaya text-3xl sm:text-4xl lg:text-5xl text-ink font-medium">
              Our Services
            </h2>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center text-xs uppercase tracking-widest font-semibold text-ink hover:text-muted transition-colors"
          >
            <span>Explore All 6 Services</span>
            <LuArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>

        {/* 3-Column Borderless Teaser (UI-UX §34) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
          {featuredServices.map((svc) => {
            const Icon = svc.icon;
            return (
              <div key={svc.id} className="space-y-4 group">
                <div className="w-12 h-12 rounded-sm bg-white border border-border flex items-center justify-center text-ink transition-transform duration-200 group-hover:scale-110">
                  <Icon className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="font-inter text-lg sm:text-xl font-semibold text-ink">
                  {svc.title}
                </h3>
                <p className="font-inter text-sm text-muted leading-relaxed line-clamp-3">
                  {svc.description}
                </p>
                <div className="pt-2">
                  <Link
                    to="/services"
                    className="inline-flex items-center text-xs uppercase tracking-wider font-medium text-ink hover:underline"
                  >
                    <span>Read Details</span>
                    <LuArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceTeaser;
