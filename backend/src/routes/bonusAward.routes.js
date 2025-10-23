import express from 'express';
import {
    getAwardedBonuses,
    recordBonusAward,
    recordBonusAwardsBatch
} from '../controllers/bonusAward.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Get awarded bonuses for a user in a year
router.get('/', authenticateToken, getAwardedBonuses);

// Record a single bonus award
router.post('/', authenticateToken, recordBonusAward);

// Record multiple bonus awards in batch
router.post('/batch', authenticateToken, recordBonusAwardsBatch);

export default router;
