import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

export const ProjectCard = ({ project }) => {
  const imageUrl = buildCloudinaryUrl(project.coverImage, { width: 900, height: 620 });

  return (
    <Link
      to={`/projects/${project.slug}`}
      className="group block space-y-4 text-ink focus:outline-none"
    >
      <div className="aspect-[16/11] bg-surface rounded-md overflow-hidden border border-border">
        <img
          src={imageUrl}
          alt={project.title}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Badge variant="default">{project.category}</Badge>
          {project.year && (
            <span className="font-mono text-xs text-muted">
              {project.year}
            </span>
          )}
        </div>

        <h3 className="font-abhaya text-2xl sm:text-3xl text-ink font-medium group-hover:text-black group-hover:underline transition-colors">
          {project.title}
        </h3>

        <div className="flex items-center space-x-3 text-xs text-muted">
          {project.location && <span>{project.location}</span>}
          {project.location && project.area && <span>·</span>}
          {project.area && <span>{project.area}</span>}
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
