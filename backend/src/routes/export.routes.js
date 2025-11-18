import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, authorizeRole } from '../middlewares/auth.js';
import { listExports, createExport, getExport, downloadExport, listDepartmentSubmissions, exportDepartmentSummary, exportBranchSummary, deleteExport } from '../controllers/export.controller.js';

const router = express.Router();

// Store incoming files initially under /uploads using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, `export-${unique}${ext || '.xlsx'}`);
  },
});
const upload = multer({ storage });

router.get('/', authenticateToken, listExports);
router.get('/department-submissions', authenticateToken, listDepartmentSubmissions);
router.get('/department-summary', authenticateToken, exportDepartmentSummary);
router.get('/branch-summary', authenticateToken, exportBranchSummary);
router.post('/', authenticateToken, upload.single('file'), createExport);
router.get('/:id', authenticateToken, getExport);
router.get('/:id/download', authenticateToken, downloadExport);
router.delete('/:id', authenticateToken, authorizeRole('Admin'), deleteExport);

export default router;
