import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../../../shared/components/Button';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

export const ProjectCard = ({ project }) => {
  const reduce = useReducedMotion();
  const imageSource =
    project.coverImage || project.images?.[0]?.url || project.gallery?.[0] || '';
  const imageUrl = imageSource
    ? buildCloudinaryUrl(imageSource, { width: 1000, height: 1000 })
    : '';
  const summary = project.shortDescription || project.description;

  return (
    <article className="border border-border bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="aspect-[4/3] md:aspect-auto md:min-h-[320px] lg:min-h-[420px] 2xl:min-h-[520px] overflow-hidden bg-surface border-b md:border-b-0 md:border-r border-border">
          {imageUrl && (
            <motion.img
              src={imageUrl}
              alt={project.title}
              loading="lazy"
              whileHover={reduce ? undefined : { scale: 1.04 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full h-full object-cover object-center"
            />
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 sm:gap-5 p-6 sm:p-10 lg:p-14 2xl:p-20">
          <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-ink font-medium leading-snug">
            {project.title}
          </h2>

          {summary && (
            <p className="font-inter text-sm sm:text-base text-muted leading-relaxed max-w-prose">
              {summary}
            </p>
          )}

          <div className="pt-2">
            <Button
              to={`/projects/${project.slug}`}
              variant="Secondary-Outline"
              size="sm"
              label="View details"
            />
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
