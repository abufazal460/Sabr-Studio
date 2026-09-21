import React from 'react';
import { statsData } from '../data/stats.data';

export const StatBlock = () => {
  return (
    <section className="w-full border-b border-border bg-white" aria-label="Studio Statistics">
      <div className="max-w-container-wide mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-x border-border">
          {statsData.map((stat, idx) => (
            <div
              key={idx}
              className="px-8 py-10 sm:py-14 text-center sm:text-left flex flex-col justify-center space-y-2 group hover:bg-surface transition-colors duration-200"
            >
              <div className="font-inter text-4xl sm:text-5xl font-semibold text-ink tracking-tight">
                {stat.value}
              </div>
              <div className="font-inter text-xs sm:text-sm text-muted uppercase tracking-wider font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatBlock;
