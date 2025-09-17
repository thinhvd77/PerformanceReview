import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middlewares/auth.js';
import { listExports, createExport, getExport, downloadExport } from '../controllers/export.controller.js';

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
router.post('/', authenticateToken, upload.single('file'), createExport);
router.get('/:id', authenticateToken, getExport);
router.get('/:id/download', authenticateToken, downloadExport);

export default router;
