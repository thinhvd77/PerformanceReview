import { AppDataSource } from '../config/database.js';
import { FormTemplate } from '../entities/FormTemplate.js';

export const listFormTemplates = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(FormTemplate.options.name);
    const items = await repo.find({ order: { id: 'DESC' } });
    res.json(items);
  } catch (err) {
    console.error('Error listing form templates:', err);
    res.status(500).json({ message: 'Failed to list form templates' });
  }
};

export const getFormTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const repo = AppDataSource.getRepository(FormTemplate.options.name);
    const item = await repo.findOne({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Form template not found' });
    res.json(item);
  } catch (err) {
    console.error('Error getting form template:', err);
    res.status(500).json({ message: 'Failed to get form template' });
  }
};
