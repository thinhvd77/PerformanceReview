import { handleSaveQuarterPlan, handleImportQuarterPlan, handleGetQuarterPlan } from "../controllers/quarterPlan.controller.js";
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

// Get quarter plan for a user
router.get('/', authenticateToken, handleGetQuarterPlan);

// Import quarter plan from Excel file
router.post('/import', authenticateToken, upload.single('file'), handleImportQuarterPlan);

// Save quarter plan data
router.post('/', authenticateToken, handleSaveQuarterPlan);

export default router;
