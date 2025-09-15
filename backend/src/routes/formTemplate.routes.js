import express from 'express';
import { listFormTemplates, getFormTemplate, deleteFormTemplate } from '../controllers/formTemplate.controller.js';

const router = express.Router();

router.get('/', listFormTemplates);
router.get('/:id', getFormTemplate);
router.delete('/:id', deleteFormTemplate);

export default router;
