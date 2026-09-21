import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import { getProjectBySlug } from '../api/projects.api';
import NotFoundState from '../../../shared/components/NotFoundState';
import ErrorState from '../../../shared/components/ErrorState';
import Skeleton from '../../../shared/components/Skeleton';
import Badge from '../../../shared/components/Badge';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

export const ProjectDetail = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectBySlug(slug);
      if (res.success && res.data) {
        setProject(res.data);
      } else if (res.data) {
        setProject(res.data);
      } else {
        setProject(null);
      }
    } catch (err) {
      if (err.status === 404) {
        setProject(null);
      } else {
        setError(err.message || 'Failed to load project details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full py-16 sm:py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-8">
          <Skeleton width="160px" height="20px" />
          <Skeleton width="60%" height="48px" />
          <Skeleton height="500px" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              <Skeleton height="24px" />
              <Skeleton height="24px" />
              <Skeleton width="80%" height="24px" />
            </div>
            <div className="lg:col-span-4">
              <Skeleton height="200px" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <ErrorState
            title="Failed to Load Commission"
            message={error}
            retryAction={fetchProject}
          />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <NotFoundState
            title="Commission Not Found"
            message="The requested architectural project dossier could not be located in our archive."
            backTo="/projects"
            backLabel="Back to All Projects"
          />
        </div>
      </div>
    );
  }

  const heroImageUrl = buildCloudinaryUrl(project.coverImage, { width: 1800, height: 1012 });

  return (
    <div className="w-full bg-white">
      <Seo
        title={`${project.title} · Architectural Project`}
        description={project.description || `Architectural commission by Sabr Studio: ${project.title}.`}
        image={project.coverImage}
      />

      <article className="py-12 sm:py-20 border-b border-border">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-12">
          {/* Back link */}
          <div>
            <Link
              to="/projects"
              className="inline-flex items-center text-xs uppercase tracking-widest text-muted hover:text-ink transition-colors font-medium"
            >
              <LuArrowLeft className="mr-2 w-4 h-4" />
              All Projects
            </Link>
          </div>

          {/* Title and Intro */}
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center space-x-3">
              <Badge variant="default">{project.category}</Badge>
              {project.year && (
                <span className="text-xs font-mono text-muted">
                  Completed {project.year}
                </span>
              )}
            </div>

            <h1 className="font-abhaya text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-ink leading-[1.08]">
              {project.title}
            </h1>

            {project.location && (
              <p className="font-inter text-sm sm:text-base text-muted font-medium">
                {project.location}
              </p>
            )}
          </div>

          {/* Hero / Main Image (aspect-[16/9], object-cover, Cloudinary-optimized) */}
          <div className="aspect-[16/9] w-full rounded-md overflow-hidden bg-surface border border-border">
            <img
              src={heroImageUrl}
              alt={project.title}
              loading="eager"
              fetchpriority="high"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Project Parameters & Editorial Narrative */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 pt-6">
            {/* Narrative text */}
            <div className="lg:col-span-8 space-y-6 text-muted text-base leading-relaxed">
              <h2 className="font-abhaya text-2xl sm:text-3xl text-ink font-medium">
                Architectural Concept & Spatial Harmony
              </h2>
              <p className="whitespace-pre-line">{project.description}</p>
            </div>

            {/* Parameters Grid */}
            <div className="lg:col-span-4 bg-surface border border-border p-6 sm:p-8 rounded-md space-y-4 text-xs">
              <div className="uppercase tracking-widest font-semibold text-ink pb-3 border-b border-border">
                Commission Dossier
              </div>
              <div className="space-y-3 divide-y divide-border">
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-muted">Typology</span>
                  <span className="font-medium text-ink text-right">{project.category}</span>
                </div>
                {project.location && (
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-muted">Location</span>
                    <span className="font-medium text-ink text-right">{project.location}</span>
                  </div>
                )}
                {project.area && (
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-muted">Floor Area</span>
                    <span className="font-medium text-ink text-right">{project.area}</span>
                  </div>
                )}
                {project.year && (
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-muted">Completion</span>
                    <span className="font-medium text-ink text-right">{project.year}</span>
                  </div>
                )}
                {project.materials && (
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-muted">Core Materials</span>
                    <span className="font-medium text-ink text-right max-w-[180px]">{project.materials}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Gallery Grid (2-column desktop / 1 mobile) */}
          {Array.isArray(project.gallery) && project.gallery.length > 0 && (
            <div className="pt-12 space-y-8">
              <h3 className="font-abhaya text-2xl sm:text-3xl text-ink font-medium border-t border-border pt-8">
                Visual Documentation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {project.gallery.map((imgUrl, idx) => {
                  const optimizedUrl = buildCloudinaryUrl(imgUrl, { width: 1000, height: 750 });
                  return (
                    <div
                      key={idx}
                      className="aspect-[4/3] rounded-md overflow-hidden bg-surface border border-border"
                    >
                      <img
                        src={optimizedUrl}
                        alt={`${project.title} detail photograph ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Inquiry CTA Section */}
      <section className="py-20 sm:py-28 lg:py-32 bg-surface" aria-label="Commission Inquiry">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <EnquiryForm
            title="Inquire About Similar Architecture"
            subtitle={`Discuss commissioning an architectural or interior work inspired by ${project.title}.`}
          />
        </div>
      </section>
    </div>
  );
};

export default ProjectDetail;
