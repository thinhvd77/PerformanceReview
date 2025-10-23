/**
 * Form Loading and Initialization Utilities
 * Functions for loading templates and computing initial state
 */

import { resolveSectionOptions } from "../constants/sectionOptions.js";

/**
 * Compute default criteria selection values for all rows with section options
 * 
 * @param {Object} baseTable - Base table from template
 * @returns {Object} Map of row keys to default option values
 */
export function computeDefaultCriteria(baseTable) {
    if (!baseTable?.rows) return {};

    const result = {};
    baseTable.rows.forEach((row, index) => {
        const criteria = String(row?.cells?.[1]?.value || "").trim();
        const rowKey = criteria || `row-${index}`;
        const options = resolveSectionOptions(criteria);
        if (options[0]) {
            result[rowKey] = options[0].value;
        }
    });

    return result;
}

/**
 * Load form template from API
 * Fetches template by ID if provided, otherwise gets the first available template
 * 
 * @param {Object} api - API instance
 * @param {string|null} id - Form template ID (optional)
 * @returns {Promise<Object|null>} Template object or null
 */
export async function loadFormTemplate(api, id) {
    let template = null;

    if (id) {
        const { data } = await api.get(`/forms/${id}`);
        template = data;
    } else {
        const { data: list } = await api.get("/forms");
        if (Array.isArray(list) && list.length > 0) {
            template = list[0];
        }
    }

    return template || null;
}
