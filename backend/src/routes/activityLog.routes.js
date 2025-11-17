import express from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.js';
import { listActivityLogs } from '../controllers/activityLog.controller.js';

const router = express.Router();

router.get('/', authenticateToken, listActivityLogs);

export default router;
