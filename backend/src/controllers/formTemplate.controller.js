import { AppDataSource } from '../config/database.js';
import { FormTemplate } from '../entities/FormTemplate.js';

export const listFormTemplates = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(FormTemplate.options.name);
    const items = await repo.find({ order: { id: 'DESC' } });

    const { branchId, departmentId, positionId } = req.query || {};
    const hasFilter = !!(branchId && departmentId && positionId);

    if (!hasFilter) {
      return res.json(items);
    }

    const matches = (it) => {
      // Prefer multi-groups
      if (Array.isArray(it.assignedGroups) && it.assignedGroups.length > 0) {
        return it.assignedGroups.some(
          (g) => g?.branchId === branchId && g?.departmentId === departmentId && g?.positionId === positionId
        );
      }
      // Legacy single group
      if (it.assignedGroup) {
        const g = it.assignedGroup;
        return g?.branchId === branchId && g?.departmentId === departmentId && g?.positionId === positionId;
      }
      return false;
    };

    const filtered = items.filter(matches);
    return res.json(filtered);
  } catch (err) {
    console.error('Error listing form templates:', err);
    res.status(500).json({ message: 'Failed to list form templates' });
  }
};

export const getFormTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(id);
    
    const repo = AppDataSource.getRepository(FormTemplate.options.name);
    const item = await repo.findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Form template not found' });
    res.json(item);
  } catch (err) {
    console.error('Error getting form template:', err);
    res.status(500).json({ message: 'Failed to get form template' });
  }
};

export const deleteFormTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const repo = AppDataSource.getRepository(FormTemplate.options.name);
    const item = await repo.findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Form template not found' });

    await repo.remove(item);
    res.status(200).json({ message: 'Form template deleted successfully' });
  } catch (err) {
    console.error('Error deleting form template:', err);
    res.status(500).json({ message: 'Failed to delete form template' });
  }
};
