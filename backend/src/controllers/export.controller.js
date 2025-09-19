import fs from 'fs';
import path from 'path';
import {AppDataSource} from '../config/database.js';
import {ExportRecord} from '../entities/ExportRecord.js';

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
};

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');
ensureDir(EXPORT_DIR);

export const listExports = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
        const q = (req.query.q || '').toString().trim().toLowerCase();

        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const qb = repo.createQueryBuilder('e')
            .orderBy('e.id', 'DESC')
            .skip((page - 1) * pageSize)
            .take(pageSize);

        if (q) {
            // match by fileName or meta->employee_name (if driver supports jsonb path, use LIKE on stringified JSON as fallback)
            qb.where("LOWER(e.fileName) LIKE :q", {q: `%${q}%`});
        }

        const [data, total] = await qb.getManyAndCount();
        res.json({data, total, page, pageSize});
    } catch (err) {
        res.status(500).json({message: 'Failed to list exports'});
    }
};

export const createExport = async (req, res) => {
    try {
        // multer provides file (single) and body for fields
        const file = req.file; // required
        if (!file) return res.status(400).json({message: 'No file uploaded'});

        const employee_code = req.user?.username;
        const {employee_name, formId, fileName, departmentId, table} = req.body || {};

        // Move file to exports subdir (it is currently in uploads root by multer config)
        const originalPath = path.join(process.cwd(), 'uploads', file.filename);
        const safeName = fileName && typeof fileName === 'string' ? fileName : (file.originalname || file.filename);
        const finalPath = path.join(EXPORT_DIR, file.filename);
        if (originalPath !== finalPath) {
            fs.renameSync(originalPath, finalPath);
        }

        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        // let parsedMeta = null;
        // try { parsedMeta = meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : null; } catch (_) {}

        const entity = repo.create({
            employee_code: employee_code,
            employee_name: employee_name,
            formId: formId ? parseInt(formId, 10) : null,
            fileName: safeName,
            filePath: path.relative(process.cwd(), finalPath).replace(/\\/g, '/'),
            departmentId: departmentId || null,
            table: table ? (typeof table === 'string' ? JSON.parse(table) : table) : null,
            // meta: parsedMeta,
        });
        const saved = await repo.save(entity);

        res.status(201).json({
            id: saved.id,
            message: 'Export saved',
            downloadUrl: `/api/exports/${saved.id}/download`,
        });
    } catch (err) {
        console.error('createExport error:', err);
        res.status(500).json({message: 'Failed to save export'});
    }
};

export const getExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const entity = await repo.findOne({where: {id}});
        if (!entity) return res.status(404).json({message: 'Not found'});
        res.json(entity);
    } catch (err) {
        res.status(500).json({message: 'Failed to get export'});
    }
};

export const downloadExport = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const repo = AppDataSource.getRepository(ExportRecord.options.name);
        const entity = await repo.findOne({where: {id}});
        if (!entity) return res.status(404).json({message: 'Not found'});
        const absPath = path.join(process.cwd(), entity.filePath);
        if (!fs.existsSync(absPath)) return res.status(404).json({message: 'File missing'});
        res.download(absPath, entity.fileName || path.basename(absPath));
    } catch (err) {
        res.status(500).json({message: 'Failed to download export'});
    }
};
