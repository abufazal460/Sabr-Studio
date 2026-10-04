import React from 'react';
import { motion } from 'framer-motion';
import HeroSlider from '../components/HeroSlider';
import AboutSection from '../components/AboutSection';
import ServiceTeaser from '../components/ServiceTeaser';
import ProjectHomeThumb from '../components/ProjectHomeThumb';
import ProcessSection from '../components/ProcessStep';
import TestimonialsSection from '../components/TestimonialCard';
import FaqSection from '../components/FaqAccordionItem';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { fadeUpProps } from '../../../shared/animations/reveal';

export const Home = () => {
  const reduce = useReducedMotion();

  return (
    <div className="w-full overflow-x-clip bg-white">
      <Seo
        title="Architecture & Interior Practice"
        description="Sabr Studio crafts monolithic residential and commercial environments celebrating tactile wabi-sabi textures, filtered daylight, and bespoke furniture craft in New Delhi."
      />

      {/* 1. Hero Section: 2-image cross-fade slider */}
      <HeroSlider />

      {/* 1b. About Section: founder + stats + scroll-scrubbed project cards */}
      <AboutSection />

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
      <section className="py-14 sm:py-20 lg:py-24 bg-surface border-b border-border" aria-label="Consultation Enquiry">
        <motion.div {...fadeUpProps(reduce, 0, 20, 0.15)} className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <EnquiryForm
            title="Initiate a Commission"
            subtitle="Connect with our principal design studio to discuss your residential architecture, interior transformation, or bespoke furniture brief."
          />
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
