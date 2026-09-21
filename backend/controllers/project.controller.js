import { projectService } from '../services/project.service.js';

export const projectController = {
  async getPublicProjects(req, res) {
    try {
      const items = await projectService.getPublicProjects(req.query);
      return res.status(200).json({
        success: true,
        data: items,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve projects',
      });
    }
  },

  async getPublicProjectBySlug(req, res) {
    try {
      const slug = req.params?.slug || req.url.split('/').pop();
      const project = await projectService.getPublicProjectBySlug(slug);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: `Project "${slug}" not found or unpublished`,
        });
      }
      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve project details',
      });
    }
  },

  async getAdminProjects(req, res) {
    try {
      const items = await projectService.getAdminProjects();
      return res.status(200).json({
        success: true,
        data: items,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve projects for admin',
      });
    }
  },

  async getAdminProjectById(req, res) {
    try {
      const id = req.params?.id || req.url.split('/').pop();
      const project = await projectService.getAdminProjectById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve project',
      });
    }
  },

  async createProject(req, res) {
    try {
      const newProject = await projectService.createProject(req.body);
      return res.status(201).json({
        success: true,
        data: newProject,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to create project',
      });
    }
  },

  async updateProject(req, res) {
    try {
      const id = req.params?.id || req.url.split('/')[4] || req.url.split('/').pop();
      const updated = await projectService.updateProject(id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Project not found for update',
        });
      }
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update project',
      });
    }
  },

  async deleteProject(req, res) {
    try {
      const id = req.params?.id || req.url.split('/').pop();
      const deleted = await projectService.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Project not found for deletion',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
        data: null,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to delete project',
      });
    }
  },
};
