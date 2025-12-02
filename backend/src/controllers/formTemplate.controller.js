import {
    listFormTemplatesService,
    getFormTemplateByIdService,
    deleteFormTemplateService
} from '../services/formTemplate.service.js';

export const listFormTemplates = async (req, res) => {
    try {
        const { branchId, departmentId, positionId } = req.query || {};
        const items = await listFormTemplatesService({ branchId, departmentId, positionId });
        return res.json(items);
    } catch (err) {
        console.error('Error listing form templates:', err);
        res.status(500).json({ message: 'Failed to list form templates' });
    }
};

export const getFormTemplate = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const item = await getFormTemplateByIdService(id);
        if (!item) {
            return res.status(404).json({ message: 'Form template not found' });
        }
        res.json(item);
    } catch (err) {
        console.error('Error getting form template:', err);
        res.status(500).json({ message: 'Failed to get form template' });
    }
};

export const deleteFormTemplate = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await deleteFormTemplateService(id);

        if (!result.success) {
            return res.status(result.status).json({ message: result.message });
        }
        res.status(200).json({ message: result.message });
    } catch (err) {
        console.error('Error deleting form template:', err);
        res.status(500).json({ message: 'Failed to delete form template' });
    }
};
