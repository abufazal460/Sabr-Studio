import React from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import StatBlock from '../components/StatBlock';
import ExpertiseSection from '../components/ExpertiseCard';
import ServiceTeaser from '../components/ServiceTeaser';
import ProjectHomeThumb from '../components/ProjectHomeThumb';
import ProcessSection from '../components/ProcessStep';
import TestimonialsSection from '../components/TestimonialCard';
import FaqSection from '../components/FaqAccordionItem';
import EnquiryForm from '../../enquiry/components/EnquiryForm';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';

export const Home = () => {
  return (
    <div className="w-full">
      <Seo
        title="Architecture & Interior Practice"
        description="Sabr Studio crafts monolithic residential and commercial environments celebrating tactile wabi-sabi textures, filtered daylight, and bespoke furniture craft in New Delhi."
      />

      {/* 1. Hero Section: 2-image cross-fade slider */}
      <HeroSlider />

      {/* 2. Studio Philosophy / About Teaser */}
      <section className="py-20 sm:py-28 lg:py-32 border-b border-border bg-white" aria-label="Studio Ethos">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs uppercase tracking-widest text-muted font-medium block">
                Our Foundation
              </span>
              <h2 className="font-abhaya text-3xl sm:text-5xl text-ink leading-[1.15] font-medium">
                An architecture of reduction, tactile warmth, and quiet permanence.
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-6 text-muted text-sm sm:text-base leading-relaxed">
              <p>
                Founded in New Delhi in 2012, Sabr Studio operates at the intersection of monolithic structural clarity and time-honored artisanal joinery. We believe genuine elegance does not shout; it manifests through natural lime washes, textured volcanic stone, and deeply human proportions.
              </p>
              <p>
                Every project begins as a dialogue with the natural qualities of the site — the way winter sun strikes a courtyard floor, the acoustics of a double-height living pavilion, and the tactile touch of hand-planed Indian teak.
              </p>
              <div className="pt-2">
                <Button
                  to="/about"
                  variant="Secondary-Outline"
                  size="default"
                  label="Read Our Story"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip (4 numbers) */}
      <StatBlock />

      {/* 4. Expertise 2x2 Grid + Trust Strip */}
      <ExpertiseSection />

      {/* 5. Services Teaser (3-column borderless) */}
      <ServiceTeaser />

      {/* 6. Projects Strip (4-image edge-to-edge row) */}
      <ProjectHomeThumb />

      {/* 7. Process Section (How We Work, 6 steps) */}
      <ProcessSection />

      {/* 8. Testimonials Carousel */}
      <TestimonialsSection />

      {/* 9. FAQ Section (Single-open smooth grid accordion) */}
      <FaqSection />

      {/* 10. Consultation Enquiry Section */}
      <section className="py-20 sm:py-28 lg:py-32 bg-surface border-b border-border" aria-label="Consultation Enquiry">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <EnquiryForm
            title="Initiate a Commission"
            subtitle="Connect with our principal design studio to discuss your residential architecture, interior transformation, or bespoke furniture brief."
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
