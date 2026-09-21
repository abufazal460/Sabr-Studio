import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/protect.middleware.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';
import { loginValidator } from '../validators/auth.validator.js';

const router = express.Router();

/**
 * Auth Routes
 * References: Master Context §6.2, 05-auth.md §4, §10; API.md §9, §10, §11
 */

// POST /api/auth/login — Public, strictly rate-limited, validated
router.post('/login', authLimiter, loginValidator, (req, res) => authController.login(req, res));

// GET /api/auth/me — Protected, returns current admin identity
router.get('/me', protect, (req, res) => authController.getMe(req, res));

// POST /api/auth/logout — Protected, clears auth cookie
router.post('/logout', protect, (req, res) => authController.logout(req, res));

export default router;
