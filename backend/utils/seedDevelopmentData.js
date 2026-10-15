// Development seed script – populates MongoDB with in‑memory seed data if collections are empty.
// This MUST NEVER run in production. Guarded by both NODE_ENV and isFallbackEnabled.

import { Project, inMemoryProjects } from '../models/project.model.js';
import { Retail, inMemoryRetail } from '../models/retail.model.js';
import { isFallbackEnabled } from '../utils/fallbackStorage.js';

export async function seedDevelopmentData() {
  if (process.env.NODE_ENV === 'production') return;
  if (!isFallbackEnabled()) return;

  // Helper to insert only when collection is empty
  const seedIfEmpty = async (Model, items, name) => {
    try {
      const count = await Model.countDocuments();
      if (count === 0 && Array.isArray(items) && items.length) {
        // Remove any existing inMemory IDs that might conflict with Mongo's ObjectId generation
        const docs = items.map((it) => {
          const { _id, id: _idAlias, ...rest } = it; // discard fake ids
          return rest;
        });
        await Model.insertMany(docs);
        console.log(`[seed] Inserted ${docs.length} ${name} records into MongoDB`);
      }
    } catch (e) {
      console.error(`[seed] Error seeding ${name}:`, e.message);
    }
  };

  await Promise.all([
    seedIfEmpty(Project, inMemoryProjects, 'projects'),
    seedIfEmpty(Retail, inMemoryRetail, 'retail'),
  ]);
}
