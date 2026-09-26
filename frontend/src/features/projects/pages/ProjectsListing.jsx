import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { getProjects } from '../api/projects.api';
import ProjectCard from '../components/ProjectCard';
import { Button } from '../../../shared/components/Button';
import Skeleton from '../../../shared/components/Skeleton';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import EnquiryForm from '../../enquiries/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';

const BATCH_SIZE = 3;

export const ProjectsListing = () => {
  const reduce = useReducedMotion();
  const [projects, setProjects] = useState([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProjects();
      if (res.success && Array.isArray(res.data)) {
        setProjects(res.data);
      } else {
        setProjects(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve project archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const total = projects.length;
  const visibleProjects = projects.slice(0, visibleCount);
  const hasHiddenProjects = visibleCount < total;
  const showBatchButton = total > BATCH_SIZE;

  const headingReveal = reduce
    ? {
        initial: false,
        whileInView: { clipPath: 'inset(0 0 0% 0)', y: '0%' },
        viewport: { once: true },
        transition: { duration: 0 },
      }
    : {
        initial: { clipPath: 'inset(0 0 100% 0)', y: '18%' },
        whileInView: { clipPath: 'inset(0 0 0% 0)', y: '0%' },
        viewport: { once: true, amount: 0.4 },
        transition: { duration: 0.6, ease: 'easeOut' },
      };

  return (
    <div className="w-full bg-white">
      <Seo
        title="Architectural Portfolio & Projects"
        description="Explore the architectural archive of Sabr Studio — private residential courtyards, commercial flagships, and contemplative hospitality spaces."
      />

      <section className="py-16 sm:py-24 lg:py-28 2xl:py-36" aria-label="Project Archive">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16">
          <motion.h1
            {...headingReveal}
            className="font-inter font-bold text-5xl sm:text-6xl lg:text-7xl 2xl:text-8xl text-black text-center tracking-tight mb-14 sm:mb-20 lg:mb-24 2xl:mb-32"
          >
            Projects
          </motion.h1>

          {loading ? (
            <div className="space-y-10 sm:space-y-14 lg:space-y-16 2xl:space-y-20">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 border border-border">
                  <Skeleton height="280px" />
                  <div className="p-6 sm:p-10 space-y-4">
                    <Skeleton width="70%" height="28px" />
                    <Skeleton width="90%" height="16px" />
                    <Skeleton width="40%" height="36px" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Unable to load projects"
              message={error}
              onRetry={fetchProjects}
            />
          ) : total === 0 ? (
            <EmptyState
              title="No projects found"
              description="We do not currently have any published commissions."
            />
          ) : (
            <>
              <div className="space-y-10 sm:space-y-14 lg:space-y-16 2xl:space-y-20">
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={project.id || project._id || project.slug}
                    project={project}
                  />
                ))}
              </div>

              {showBatchButton && (
                <div className="flex justify-center pt-12 sm:pt-16 2xl:pt-20">
                  <Button
                    variant="Secondary-Outline"
                    label={hasHiddenProjects ? 'Load more' : 'Less'}
                    onClick={() =>
                      setVisibleCount((count) =>
                        hasHiddenProjects
                          ? Math.min(total, count + BATCH_SIZE)
                          : Math.max(BATCH_SIZE, count - BATCH_SIZE)
                      )
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Inquiry CTA Section */}
      <section className="py-20 sm:py-28 lg:py-32 bg-surface" aria-label="Project Commission Inquiry">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <EnquiryForm
            title="Commission an Architectural Project"
            subtitle="Connect with our design office to discuss site potentials, masterplanning, or interior spatial transformations."
          />
        </div>
      </section>
    </div>
  );
};

export default ProjectsListing;
