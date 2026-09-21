import React, { useState, useEffect } from 'react';
import { getProjects } from '../api/projects.api';
import ProjectCard from '../components/ProjectCard';
import SectionHeading from '../../../shared/components/SectionHeading';
import Skeleton from '../../../shared/components/Skeleton';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import EnquiryForm from '../../enquiry/components/EnquiryForm';
import Seo from '../../../shared/components/Seo';

const categories = ['All', 'Residential', 'Commercial', 'Hospitality'];

export const ProjectsListing = () => {
  const [projects, setProjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
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

  const filteredProjects =
    selectedCategory === 'All'
      ? projects
      : projects.filter(
          (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <div className="w-full bg-white">
      <Seo
        title="Architectural Portfolio & Projects"
        description="Explore the architectural archive of Sabr Studio — private residential courtyards, commercial flagships, and contemplative hospitality spaces."
      />

      {/* Header & Filter Section */}
      <section className="py-20 sm:py-28 border-b border-border" aria-label="Project Archive">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <div className="max-w-3xl mb-12">
            <SectionHeading
              eyebrow="Architectural Portfolio"
              title="Selected Architectural Works"
              description="A curated archive of residential retreats, creative commercial workspaces, and bespoke hospitality destinations shaped by natural light and monolithic restraint."
              as="h1"
            />
          </div>

          {/* Category Filter Pills (UI-UX §35 & §10) */}
          <div className="flex flex-wrap gap-2.5 pb-8 border-b border-border mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs uppercase tracking-wider px-5 py-2.5 transition-colors font-medium border rounded-full ${
                  selectedCategory === cat
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-muted border-border hover:text-black hover:border-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid / Loading / Error / Empty States */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton height="360px" />
                  <Skeleton width="40%" height="20px" />
                  <Skeleton width="70%" height="28px" />
                  <Skeleton width="50%" height="16px" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Unable to load architectural works"
              message={error}
              retryAction={fetchProjects}
            />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              title="No projects found"
              message={`We do not currently have any published commissions under "${selectedCategory}".`}
              actionLabel="Show All Projects"
              onAction={() => setSelectedCategory('All')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id || project.slug} project={project} />
              ))}
            </div>
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
