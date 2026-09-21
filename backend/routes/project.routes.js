import express from 'express';
import { projectController } from '../controllers/project.controller.js';
import { protect } from '../middlewares/protect.middleware.js';
import {
  createProjectValidator,
  updateProjectValidator,
} from '../validators/project.validator.js';

const router = express.Router();

/**
 * Public Project Routes
 * References: API.md §2.2, prompts/06-features.md §4.2
 */
router.get('/', (req, res) => projectController.getPublicProjects(req, res));
router.get('/:slug', (req, res) => projectController.getPublicProjectBySlug(req, res));

/**
 * Admin Project Routes (Protected)
 * References: API.md §2.2, prompts/06-features.md §5.3
 */
router.get('/admin/projects', protect, (req, res) => projectController.getAdminProjects(req, res));
router.get('/admin/projects/:id', protect, (req, res) => projectController.getAdminProjectById(req, res));
router.post(
  '/admin/projects',
  protect,
  createProjectValidator,
  (req, res) => projectController.createProject(req, res)
);
router.put(
  '/admin/projects/:id',
  protect,
  updateProjectValidator,
  (req, res) => projectController.updateProject(req, res)
);
router.delete('/admin/projects/:id', protect, (req, res) =>
  projectController.deleteProject(req, res)
);

export default router;
