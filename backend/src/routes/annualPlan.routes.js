import { handleSaveAnnualPlan, handleImportAnnualPlan, handleGetAnnualPlan } from "../controllers/annualPlan.controller.js";
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

// Get annual plan for a user
router.get('/', authenticateToken, handleGetAnnualPlan);

// Import annual plan from Excel file
router.post('/import', authenticateToken, upload.single('file'), handleImportAnnualPlan);

// Save annual plan data
router.post('/', authenticateToken, handleSaveAnnualPlan);

export default router;