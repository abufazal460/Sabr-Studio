import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LuLampCeiling, LuArmchair, LuTrees } from 'react-icons/lu';

gsap.registerPlugin(ScrollTrigger);

// Home Services trio per the Figma `home/service` design (title, copy, icon).
const homeServices = [
  {
    id: 'lighting-design',
    icon: LuLampCeiling,
    title: 'Lighting Design',
    description:
      'Achieve the perfect balance of ambient, task, and accent lighting for a functional atmosphere',
  },
  {
    id: 'interior-design',
    icon: LuArmchair,
    title: 'Interior Design',
    description:
      'From concept to completion, we oversee every detail to bring your vision to life efficiently',
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
  const sectionRef = useRef(null);
  const projectRef = useRef(null);

  // Keep this section and the project section that overlays it the same height/width
  // at every breakpoint so the pin-and-cover handoff stays aligned.
  useEffect(() => {
    // Capture the following project section before GSAP pinning reparents this section.
    if (!projectRef.current) {
      projectRef.current = sectionRef.current?.nextElementSibling || null;
    }
    const equalize = () => {
      const svc = sectionRef.current;
      const proj = projectRef.current;
      if (!svc || !proj) return;
      svc.style.height = '';
      proj.style.height = '';
      const height = Math.max(svc.scrollHeight, proj.scrollHeight);
      svc.style.height = `${height}px`;
      proj.style.height = `${height}px`;
      ScrollTrigger.refresh();
    };

    equalize();
    window.addEventListener('resize', equalize);
    window.addEventListener('load', equalize);
    return () => {
      window.removeEventListener('resize', equalize);
      window.removeEventListener('load', equalize);
    };
  }, []);

  // Pin this section; the following project section scrolls up and covers it.
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: () => '+=' + (sectionRef.current?.offsetHeight || window.innerHeight),
        pin: true,
        pinSpacing: false,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const headingEnter = reduce
    ? {
        initial: false,
        whileInView: { x: '0%', clipPath: 'inset(0 0 0 0)' },
        viewport: { once: true, amount: 0.5 },
        transition: { duration: 0 },
      }
    : {
        initial: { x: '-15%', clipPath: 'inset(0 100% 0 0)' },
        whileInView: { x: '0%', clipPath: 'inset(0 0 0 0)' },
        viewport: { once: true, amount: 0.5 },
        transition: { duration: 0.6, ease: 'easeOut' },
      };

  return (
    <section
      ref={sectionRef}
      className="relative z-0 bg-white"
      aria-label="Studio Services Overview"
    >
      <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 py-20 sm:py-28 lg:py-32">
        {/* Left rule + heading (Figma home/service) */}
        <div className="flex items-center gap-6 sm:gap-10 mb-16 sm:mb-24">
          <span aria-hidden="true" className="h-[3px] w-16 sm:w-24 bg-ink shrink-0" />
          <motion.h2
            {...headingEnter}
            className="font-inter font-bold text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight"
          >
            Our Services
          </motion.h2>
        </div>

        {/* Three service columns: icon left, title + description right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {homeServices.map((svc) => {
            const Icon = svc.icon;
            return (
              <div key={svc.id} className="flex items-start gap-5 sm:gap-6">
                <Icon
                  className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 text-ink stroke-[1.5]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-inter font-bold text-xl sm:text-2xl text-ink">
                    {svc.title}
                  </h3>
                  <p className="mt-4 sm:mt-6 font-inter text-sm sm:text-base text-muted leading-relaxed">
                    {svc.description}
                  </p>
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
