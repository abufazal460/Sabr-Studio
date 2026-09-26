import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import { getProjectBySlug } from '../api/projects.api';
import NotFoundState from '../../../shared/components/NotFoundState';
import ErrorState from '../../../shared/components/ErrorState';
import Skeleton from '../../../shared/components/Skeleton';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';

const ContentBlock = ({ block, projectTitle, index }) => {
  if (block.type === 'heading' && block.text) {
    return (
      <h2 className="font-abhaya text-2xl sm:text-3xl lg:text-4xl text-black font-medium pt-4">
        {block.text}
      </h2>
    );
  }

  if (block.type === 'paragraph' && block.text) {
    return (
      <p className="font-inter text-sm sm:text-base text-muted leading-relaxed whitespace-pre-line max-w-prose">
        {block.text}
      </p>
    );
  }

  if (block.type === 'image' && block.url) {
    return (
      <div className="aspect-[16/10] w-full overflow-hidden bg-surface border border-border rounded-md">
        <img
          src={buildCloudinaryUrl(block.url, { width: 1400, height: 875 })}
          alt={`${projectTitle} — image ${index + 1}`}
          loading="lazy"
          className="w-full h-full object-cover object-center"
        />
      </div>
    );
  }

  return null;
};

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
          <Skeleton height="500px" />
          <Skeleton width="60%" height="48px" />
          <Skeleton height="24px" />
          <Skeleton height="24px" />
          <Skeleton width="80%" height="24px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <ErrorState
            title="Failed to Load Project"
            message={error}
            onRetry={fetchProject}
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
            title="Project Not Found"
            message="The requested architectural project dossier could not be located in our archive."
            backTo="/projects"
            backLabel="Back to All Projects"
          />
        </div>
      </div>
    );
  }

  const heroSource =
    project.coverImage || project.images?.[0]?.url || project.gallery?.[0] || '';
  const heroImageUrl = heroSource
    ? buildCloudinaryUrl(heroSource, { width: 1800, height: 1012 })
    : '';
  const blocks = Array.isArray(project.contentBlocks) ? project.contentBlocks : [];
  const hasBlocks = blocks.length > 0;
  const gallery = Array.isArray(project.gallery) ? project.gallery : [];

  return (
    <div className="w-full bg-white">
      <Seo
        title={`${project.title} · Architectural Project`}
        description={
          project.shortDescription ||
          project.description ||
          `Architectural commission by Sabr Studio: ${project.title}.`
        }
        image={project.coverImage}
      />

      <article className="py-12 sm:py-20 border-b border-border">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16 space-y-10 sm:space-y-12">
          <div>
            <Link
              to="/projects"
              className="inline-flex items-center text-xs uppercase tracking-widest text-muted hover:text-ink transition-colors font-medium"
            >
              <LuArrowLeft className="mr-2 w-4 h-4" />
              All Projects
            </Link>
          </div>

          {heroImageUrl && (
            <div className="aspect-[16/9] w-full rounded-md overflow-hidden bg-surface border border-border">
              <img
                src={heroImageUrl}
                alt={project.title}
                loading="eager"
                fetchpriority="high"
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          <h1 className="font-abhaya text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-medium tracking-tight text-black leading-[1.1] max-w-4xl">
            {project.title}
          </h1>

          {hasBlocks ? (
            <div className="space-y-6 sm:space-y-8 max-w-4xl">
              {blocks.map((block, idx) => (
                <ContentBlock
                  key={idx}
                  block={block}
                  projectTitle={project.title}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl">
              {project.description && (
                <p className="font-inter text-sm sm:text-base text-muted leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              )}
              {gallery.length > 0 && (
                <div className="space-y-6 sm:space-y-8 pt-2">
                  {gallery.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="aspect-[16/10] w-full rounded-md overflow-hidden bg-surface border border-border"
                    >
                      <img
                        src={buildCloudinaryUrl(imgUrl, { width: 1400, height: 875 })}
                        alt={`${project.title} detail photograph ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  ))}
                </div>
              )}
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
