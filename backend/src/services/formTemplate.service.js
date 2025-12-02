import { AppDataSource } from '../config/database.js';
import { FormTemplate } from '../entities/FormTemplate.js';

const formTemplateRepository = AppDataSource.getRepository(FormTemplate.options.name);

/**
 * List all form templates, optionally filtered by branch/department/position
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Array>}
 */
export const listFormTemplatesService = async (filters = {}) => {
    const { branchId, departmentId, positionId } = filters;
    const items = await formTemplateRepository.find({ order: { id: 'DESC' } });

    const hasFilter = !!(branchId && departmentId && positionId);
    if (!hasFilter) {
        return items;
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

    return items.filter(matches);
};

/**
 * Get form template by ID
 * @param {number} id - Form template ID
 * @returns {Promise<Object|null>}
 */
export const getFormTemplateByIdService = async (id) => {
    return formTemplateRepository.findOne({ where: { id } });
};

/**
 * Delete form template by ID
 * @param {number} id - Form template ID
 * @returns {Promise<{success: boolean, message?: string, status?: number}>}
 */
export const deleteFormTemplateService = async (id) => {
    const item = await formTemplateRepository.findOne({ where: { id } });
    if (!item) {
        return { success: false, status: 404, message: 'Form template not found' };
    }

    await formTemplateRepository.remove(item);
    return { success: true, message: 'Form template deleted successfully' };
};

/**
 * Create form template
 * @param {Object} data - Form template data
 * @returns {Promise<Object>}
 */
export const createFormTemplateService = async (data) => {
    const entity = formTemplateRepository.create(data);
    return formTemplateRepository.save(entity);
};

/**
 * Update form template
 * @param {number} id - Form template ID
 * @param {Object} data - Update data
 * @returns {Promise<{success: boolean, data?: Object, message?: string, status?: number}>}
 */
export const updateFormTemplateService = async (id, data) => {
    const item = await formTemplateRepository.findOne({ where: { id } });
    if (!item) {
        return { success: false, status: 404, message: 'Form template not found' };
    }

    Object.assign(item, data);
    const updated = await formTemplateRepository.save(item);
    return { success: true, data: updated };
};
