import express from 'express';
import { listFormTemplates, getFormTemplate } from '../controllers/formTemplate.controller.js';

const router = express.Router();

router.get('/', listFormTemplates);
router.get('/:id', getFormTemplate);

export default router;
