import { processExcelFile } from '../services/upload.service.js';
import { AppDataSource } from '../config/database.js';
import { FormTemplate } from '../entities/FormTemplate.js';

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const result = await processExcelFile(req.file);

        // Extract assignment fields from multipart form
        const { branchId, departmentId, positionId, assignedGroup, assignedGroups } = req.body || {};
        let groups = null;
        try {
            if (assignedGroups) {
                const parsed = typeof assignedGroups === 'string' ? JSON.parse(assignedGroups) : assignedGroups;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    groups = parsed;
                }
            }
            // Fallback: legacy single group
            if (!groups) {
                let group = null;
                if (assignedGroup) {
                    group = typeof assignedGroup === 'string' ? JSON.parse(assignedGroup) : assignedGroup;
                } else if (branchId && departmentId && positionId) {
                    group = { branchId, departmentId, positionId };
                }
                if (group) groups = [group];
            }
        } catch (_) {
            // ignore parse error -> treat as null
        }

        const repo = AppDataSource.getRepository(FormTemplate.options.name);
        const payload = { name: result.title, schema: result.schema };
        if (groups && groups.length > 0) {
            payload.assignedGroups = groups;
            payload.assignedGroup = groups[0]; // keep legacy column for backward compatibility
        }
        const entity = repo.create(payload);
        const saved = await repo.save(entity);

        res.status(200).json({
            message: 'File uploaded and processed successfully',
            formTemplate: saved,
            previewData: result.jsonData.slice(0, 5),
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ message: 'Error processing file', error: error.message });
    }
}