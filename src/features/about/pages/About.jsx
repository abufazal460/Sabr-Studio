import React from 'react';
import { aboutData } from '../data/about.data';
import Badge from '../../../shared/components/Badge';
import Seo from '../../../shared/components/Seo';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

export const About = () => {
  const { hero, story, founder } = aboutData;
  const storyImageUrl = buildCloudinaryUrl(story.image, { width: 1200, height: 800 });
  const founderPhotoUrl = buildCloudinaryUrl(founder.photo, { width: 800, height: 1000 });

  return (
    <div className="w-full bg-white">
      <Seo
        title="About Our Practice"
        description="Founded in New Delhi in 2012, Sabr Studio operates at the intersection of monolithic architectural clarity, wabi-sabi stillness, and bespoke artisan joinery."
      />

      {/* 1. Editorial Hero: "Designing with soul" (UI-UX §40 & §67) */}
      <section className="py-20 sm:py-28 lg:py-32 border-b border-border bg-white" aria-label="About Hero">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <div className="mb-6">
            <span className="text-xs uppercase tracking-widest text-muted font-medium block">
              {hero.eyebrow}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end">
            {/* Left Headline with Brown Italic Accent Word */}
            <div className="lg:col-span-7">
              <h1 className="font-abhaya text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.08] text-ink">
                {hero.titleMain}{' '}
                <span className="italic text-brown font-normal">
                  {hero.accentWord}
                </span>
              </h1>
            </div>

            {/* Right-aligned intro paragraph */}
            <div className="lg:col-span-5">
              <p className="font-inter text-base sm:text-lg text-muted leading-relaxed">
                {hero.introParagraph}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About Us (Image + Story Copy) */}
      <section className="py-20 sm:py-28 lg:py-32 border-b border-border bg-white" aria-label="Studio History">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-16">
          {/* Main Story Image */}
          <div className="aspect-[16/9] w-full bg-surface border border-border rounded-md overflow-hidden">
            <img
              src={storyImageUrl}
              alt={story.imageCaption}
              loading="lazy"
              className="w-full h-full object-cover object-center"
            />
          </div>
          <p className="text-xs text-muted text-right font-inter -mt-12">
            {story.imageCaption}
          </p>

          {/* Story Content Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start pt-6">
            <div className="lg:col-span-5">
              <h2 className="font-abhaya text-3xl sm:text-4xl text-ink font-medium leading-snug">
                {story.heading}
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-6 text-muted text-sm sm:text-base leading-relaxed">
              {story.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Founders Block (photo, name, softened role line, description, "sabr" badge) */}
      <section className="py-20 sm:py-28 lg:py-32 bg-surface" aria-label="Studio Leadership">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Founder Photo */}
            <div className="lg:col-span-5">
              <div className="aspect-[4/5] bg-white border border-border rounded-md overflow-hidden shadow-xs">
                <img
                  src={founderPhotoUrl}
                  alt={founder.name}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale-[15%]"
                />
              </div>
            </div>

            {/* Founder Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <Badge variant="brown" className="mb-2">
                  {founder.badge}
                </Badge>
                <h3 className="font-abhaya text-3xl sm:text-5xl text-ink font-medium">
                  {founder.name}
                </h3>
                <p className="font-inter text-xs sm:text-sm uppercase tracking-widest text-muted font-medium">
                  {founder.role}
                </p>
              </div>

              <p className="font-inter text-sm sm:text-base text-muted leading-relaxed max-w-xl">
                {founder.bio}
              </p>

              <div className="pt-4 border-t border-border flex flex-wrap gap-8 text-xs text-muted">
                <div>
                  <span className="font-semibold text-ink block">Council of Architecture</span>
                  <span>Registered Architect (India)</span>
                </div>
                <div>
                  <span className="font-semibold text-ink block">Studio Head</span>
                  <span>New Delhi Workshop & Atelier</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer follows directly — no inquiry form per UI-UX §67 */}
    </div>
  );
};

export default About;
