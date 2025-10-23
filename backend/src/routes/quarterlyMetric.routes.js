import express from 'express';
import {
    saveQuarterlyMetrics,
    getQuarterlyMetrics,
    getPreviousQuarterMetrics
} from '../controllers/quarterlyMetric.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Save quarterly metrics (called during export)
router.post('/', authenticateToken, saveQuarterlyMetrics);

// Get quarterly metrics for a user
router.get('/', authenticateToken, getQuarterlyMetrics);

// Get previous quarter metrics (for auto-filling form)
router.get('/previous', authenticateToken, getPreviousQuarterMetrics);

export default router;
