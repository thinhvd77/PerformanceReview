import express from 'express';
import { getAnnualMetrics, saveAnnualMetrics } from '../controllers/annualMetric.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Get annual metrics for a user
router.get('/', authenticateToken, getAnnualMetrics);

// Save annual metrics
router.post('/', authenticateToken, saveAnnualMetrics);

export default router;
