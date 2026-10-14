import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import Seo from './Seo';

export const NotFoundPage = () => {
  return (
    <div className="w-full bg-white py-24 sm:py-32">
      <Seo
        title="404 — Page Not Found · Sabr Studio"
        description="The page you requested could not be located on Sabr Studio."
        noIndex
      />

      <div className="max-w-xl mx-auto px-5 sm:px-8 text-center space-y-6">
        <span className="font-inter text-xs uppercase tracking-widest text-muted font-medium block">
          404 Error
        </span>

        <h1 className="font-abhaya text-5xl sm:text-6xl text-ink font-medium tracking-tight">
          Page Not Found
        </h1>

        <p className="font-inter text-sm text-muted leading-relaxed max-w-md mx-auto">
          The architectural project, retail edition, or page you requested does not exist or has been relocated to another section of the studio archive.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button
            to="/"
            variant="Primary"
            label="Return Home"
          />
          <Button
            to="/projects"
            variant="Secondary-Outline"
            label="Browse Projects"
          />
          <Button
            to="/retail"
            variant="Secondary-Outline"
            label="View Catalog"
          />
        </div>

        <div className="pt-8 border-t border-border mt-8">
          <p className="text-xs text-muted">
            Looking for something specific?{' '}
            <Link to="/contact" className="text-ink underline hover:opacity-80">
              Contact our studio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
