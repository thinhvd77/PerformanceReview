/**
 * Column finding utilities for FormViewer
 * Provides consistent methods for locating columns by label patterns
 */

import { normalizeText } from "./formUtils.js";

/**
 * Find column index by label pattern (case-insensitive, normalized text)
 * @param {Array} columns - Array of column objects with label property
 * @param {string|string[]} pattern - Search pattern(s) to match against normalized label
 * @param {boolean} useNormalizedText - If true, use normalizeText() for matching (removes diacritics, spaces)
 * @returns {number} Column index, or -1 if not found
 */
export function findColumnIndex(columns, pattern, useNormalizedText = false) {
    if (!columns || !Array.isArray(columns)) return -1;

    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    return columns.findIndex((col) => {
        const label = String(col?.label || "");
        const searchText = useNormalizedText
            ? normalizeText(label)
            : label.toLowerCase();

        return patterns.some(p => {
            const searchPattern = useNormalizedText
                ? normalizeText(p)
                : String(p).toLowerCase();
            return searchText.includes(searchPattern);
        });
    });
}

/**
 * Find "Điểm theo mức độ hoàn thành" column (Score column)
 * @param {Array} columns - Array of column objects
 * @param {number} fallbackIndex - Fallback column index if not found (default: 6)
 * @returns {number} Column index
 */
export function findScoreColumnIndex(columns, fallbackIndex = 6) {
    const idx = findColumnIndex(columns, "điểm theo mức độ hoàn thành", false);
    return idx >= 0 ? idx : fallbackIndex;
}/**
 * Find "Kế hoạch quý này" column (Current quarter plan)
 * @param {Array} columns - Array of column objects
 * @returns {number|null} Column index or null if not found
 */
export function findPlanColumnIndex(columns) {
    const idx = findColumnIndex(columns, "kế hoạch", false);
    return idx >= 0 ? idx : null;
}

/**
 * Find "Thực hiện quý này" column (Current quarter actual)
 * @param {Array} columns - Array of column objects
 * @returns {number|null} Column index or null if not found
 */
export function findActualColumnIndex(columns) {
    const idx = findColumnIndex(columns, "thuc hien", true);
    return idx >= 0 ? idx : null;
}

/**
 * Find "Ghi chú" column (Notes/Comments)
 * @param {Array} columns - Array of column objects
 * @returns {number|null} Column index or null if not found
 */
export function findNoteColumnIndex(columns) {
    const idx = findColumnIndex(columns, "ghi chú", true);
    return idx >= 0 ? idx : null;
}

/**
 * Find all standard column indices at once
 * @param {Array} columns - Array of column objects
 * @returns {Object} Object with all column indices
 */
export function findAllColumnIndices(columns) {
    return {
        scoreColIdx: findScoreColumnIndex(columns),
        planColIdx: findPlanColumnIndex(columns),
        actualColIdx: findActualColumnIndex(columns),
        noteColIdx: findNoteColumnIndex(columns),
    };
}
